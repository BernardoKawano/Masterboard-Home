<?php

if (!defined('ABSPATH')) {
    exit;
}

function mb_candidatura_register_rest_routes(): void {
    register_rest_route('masterboard/v1', '/candidatura', [
        'methods' => 'POST',
        'callback' => 'mb_candidatura_handle_submit',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('masterboard/v1', '/candidatura/draft', [
        [
            'methods' => 'POST',
            'callback' => 'mb_candidatura_handle_draft_post',
            'permission_callback' => '__return_true',
        ],
        [
            'methods' => 'PATCH',
            'callback' => 'mb_candidatura_handle_draft_patch',
            'permission_callback' => '__return_true',
        ],
    ]);

    register_rest_route('masterboard/v1', '/cnpj/(?P<cnpj>[0-9]{14})', [
        'methods' => 'GET',
        'callback' => 'mb_candidatura_handle_cnpj_lookup',
        'permission_callback' => '__return_true',
    ]);
}

function mb_candidatura_rest_error(string $message, int $status): WP_REST_Response {
    return new WP_REST_Response(['error' => $message], $status);
}

function mb_candidatura_rest_supabase_error(array $result): WP_REST_Response {
    $status = 500;
    $message = 'Erro interno. Tente novamente.';

    if (!empty($result['code']) && $result['code'] === 'supabase_not_configured') {
        $status = 503;
        $message = 'Integração Supabase não configurada no servidor.';
    } elseif (!empty($result['code']) && $result['code'] === 'supabase_invalid_key') {
        $status = 503;
        $message = 'Chave Supabase inválida ou incompleta no wp-config.php.';
    }

    if (defined('WP_DEBUG') && WP_DEBUG && !empty($result['error'])) {
        return new WP_REST_Response(['error' => $message, 'debug' => $result['error']], $status);
    }

    return mb_candidatura_rest_error($message, $status);
}

function mb_candidatura_request_params(WP_REST_Request $request): array {
    $params = $request->get_body_params();
    return is_array($params) ? $params : [];
}

function mb_candidatura_handle_draft_post(WP_REST_Request $request) {
    $params = mb_candidatura_request_params($request);
    if (!empty($params['_gotcha'])) {
        return new WP_REST_Response(null, 200);
    }

    $payload = mb_candidatura_build_payload($params, [
        'referrer' => $request->get_header('referer') ?: '',
        'timestamp' => gmdate('c'),
        'formStep' => 0,
    ]);

    $missing = mb_candidatura_validate_draft_email($payload);
    if ($missing !== []) {
        return mb_candidatura_rest_error('Campos inválidos: ' . implode(', ', $missing), 400);
    }

    $row = mb_candidatura_to_draft_lead_row($payload, 0);
    $existing = mb_candidatura_find_draft_by_email($payload['email']);
    if (!$existing['ok']) {
        return mb_candidatura_rest_supabase_error($existing);
    }

    if (!empty($existing['lead']['id'])) {
        $update = mb_candidatura_update_supabase_lead($existing['lead']['id'], $row, 'draft');
        if (!$update['ok']) {
            return mb_candidatura_rest_supabase_error($update);
        }

        mb_candidatura_record_activity($update['lead_id'], 'step_completed', 'Rascunho atualizado (e-mail)', [
            'step' => 0,
            'source' => $payload['source'],
        ]);

        return new WP_REST_Response(['leadId' => $update['lead_id'], 'status' => 'draft'], 200);
    }

    $insert = mb_candidatura_insert_supabase($row);
    if (!$insert['ok']) {
        return mb_candidatura_rest_supabase_error($insert);
    }

    if (!empty($insert['lead_id'])) {
        mb_candidatura_record_activity($insert['lead_id'], 'created', 'Rascunho de candidatura iniciado', [
            'step' => 0,
            'source' => $payload['source'],
        ]);
    }

    return new WP_REST_Response(['leadId' => $insert['lead_id'], 'status' => 'draft'], 201);
}

function mb_candidatura_handle_draft_patch(WP_REST_Request $request) {
    $params = mb_candidatura_request_params($request);
    if (!empty($params['_gotcha'])) {
        return new WP_REST_Response(null, 200);
    }

    $form_step = isset($params['form_step']) ? (int) $params['form_step'] : -1;
    if ($form_step < 1 || $form_step > 5) {
        return mb_candidatura_rest_error('form_step inválido', 400);
    }

    $payload = mb_candidatura_build_payload($params, [
        'referrer' => $request->get_header('referer') ?: '',
        'timestamp' => gmdate('c'),
        'formStep' => $form_step,
    ]);

    if ($payload['leadId'] === '') {
        return mb_candidatura_rest_error('lead_id ausente', 400);
    }

    $missing = mb_candidatura_validate_step($form_step, $payload);
    if ($missing !== []) {
        return mb_candidatura_rest_error('Campos inválidos: ' . implode(', ', $missing), 400);
    }

    $existing = mb_candidatura_get_lead_by_id($payload['leadId']);
    if (!$existing['ok']) {
        return mb_candidatura_rest_supabase_error($existing);
    }

    $lead = $existing['lead'] ?? null;
    if (!$lead || ($lead['status'] ?? '') !== 'draft') {
        return mb_candidatura_rest_error('Rascunho não encontrado', 404);
    }

    if (strcasecmp($lead['email'], $payload['email']) !== 0) {
        return mb_candidatura_rest_error('E-mail não corresponde ao rascunho', 403);
    }

    $row = mb_candidatura_to_draft_lead_row($payload, $form_step);
    $update = mb_candidatura_update_supabase_lead($payload['leadId'], $row, 'draft');
    if (!$update['ok']) {
        return mb_candidatura_rest_supabase_error($update);
    }

    mb_candidatura_record_activity($update['lead_id'], 'step_completed', 'Passo ' . $form_step . ' salvo', [
        'step' => $form_step,
        'source' => $payload['source'],
        'score' => $row['score'],
        'priority' => $row['priority'],
    ]);

    return new WP_REST_Response(['leadId' => $update['lead_id'], 'status' => 'draft'], 200);
}

function mb_candidatura_handle_cnpj_lookup(WP_REST_Request $request) {
    $cnpj = (string) $request->get_param('cnpj');
    $result = mb_candidatura_fetch_cnpj($cnpj);

    if (!$result['ok']) {
        return mb_candidatura_rest_error($result['error'], $result['status']);
    }

    $response = new WP_REST_Response($result['data'], 200);
    $response->header('Cache-Control', 'private, max-age=300');
    return $response;
}

function mb_candidatura_handle_submit(WP_REST_Request $request) {
    $params = mb_candidatura_request_params($request);

    if (!empty($params['_gotcha'])) {
        return new WP_REST_Response(null, 200);
    }

    $payload = mb_candidatura_build_payload($params, [
        'referrer' => $request->get_header('referer') ?: '',
        'timestamp' => gmdate('c'),
        'formStep' => 6,
    ]);

    $missing = mb_candidatura_validate_payload($payload);
    if ($missing !== []) {
        return mb_candidatura_rest_error('Campos obrigatórios ausentes: ' . implode(', ', $missing), 400);
    }

    $row = mb_candidatura_to_lead_row($payload);
    $lead_id = $payload['leadId'];

    if ($lead_id !== '') {
        $existing = mb_candidatura_get_lead_by_id($lead_id);
        if (!$existing['ok']) {
            return mb_candidatura_rest_supabase_error($existing);
        }

        $lead = $existing['lead'] ?? null;
        if (!$lead) {
            return mb_candidatura_rest_error('Candidatura não encontrada', 404);
        }

        if (strcasecmp($lead['email'], $payload['email']) !== 0) {
            return mb_candidatura_rest_error('E-mail não corresponde à candidatura', 403);
        }

        if (($lead['status'] ?? '') !== 'draft') {
            return mb_candidatura_rest_error('Candidatura já foi enviada', 409);
        }

        $update = mb_candidatura_update_supabase_lead($lead_id, $row, 'draft');
        if (!$update['ok']) {
            return mb_candidatura_rest_supabase_error($update);
        }

        mb_candidatura_record_activity($update['lead_id'], 'completed', 'Candidatura finalizada pelo site', [
            'source' => $payload['source'],
            'score' => $row['score'],
            'priority' => $row['priority'],
        ]);

        mb_candidatura_forward_webhook($payload);
        return new WP_REST_Response(['success' => true, 'leadId' => $update['lead_id']], 200);
    }

    $result = mb_candidatura_insert_supabase($row);
    if (!$result['ok']) {
        return mb_candidatura_rest_supabase_error($result);
    }

    mb_candidatura_forward_webhook($payload);
    return new WP_REST_Response(['success' => true, 'leadId' => $result['lead_id'] ?? null], 201);
}
