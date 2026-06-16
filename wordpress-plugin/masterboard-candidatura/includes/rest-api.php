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
}

function mb_candidatura_handle_submit(WP_REST_Request $request) {
    $params = $request->get_body_params();

    if (!empty($params['_gotcha'])) {
        return new WP_REST_Response(null, 200);
    }

    $payload = mb_candidatura_build_payload($params, [
        'referrer' => $request->get_header('referer') ?: '',
        'timestamp' => gmdate('c'),
    ]);

    $missing = mb_candidatura_validate_payload($payload);
    if ($missing !== []) {
        return new WP_REST_Response(
            ['error' => 'Campos obrigatórios ausentes: ' . implode(', ', $missing)],
            400
        );
    }

    $row = mb_candidatura_to_lead_row($payload);
    $result = mb_candidatura_insert_supabase($row);

    if (!$result['ok']) {
        $status = 500;
        $payload = ['error' => 'Erro interno. Tente novamente.'];

        if (!empty($result['code']) && $result['code'] === 'supabase_not_configured') {
            $status = 503;
            $payload['error'] = 'Integração Supabase não configurada no servidor.';
        } elseif (!empty($result['code']) && $result['code'] === 'supabase_invalid_key') {
            $status = 503;
            $payload['error'] = 'Chave Supabase inválida ou incompleta no wp-config.php.';
        }

        if (defined('WP_DEBUG') && WP_DEBUG && !empty($result['error'])) {
            $payload['debug'] = $result['error'];
        }

        return new WP_REST_Response($payload, $status);
    }

    mb_candidatura_forward_webhook($payload);

    return new WP_REST_Response(['success' => true], 201);
}
