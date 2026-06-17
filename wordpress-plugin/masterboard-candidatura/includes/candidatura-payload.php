<?php

if (!defined('ABSPATH')) {
    exit;
}

require_once __DIR__ . '/cnpj-lookup.php';

function mb_candidatura_required_fields(): array {
    return ['email', 'nome', 'telefone', 'empresa', 'cargo', 'faturamento', 'colaboradores'];
}

function mb_candidatura_get_string(array $data, string $key): string {
    if (!isset($data[$key]) || !is_string($data[$key])) {
        return '';
    }

    return trim($data[$key]);
}

function mb_candidatura_build_payload(array $data, array $meta = []): array {
    $codigo_pais = mb_candidatura_get_string($data, 'codigo_pais') ?: '+55';
    $whatsapp = mb_candidatura_get_string($data, 'whatsapp');
    $telefone = mb_candidatura_get_string($data, 'telefone');

    if ($telefone === '' && $whatsapp !== '') {
        $telefone = trim($codigo_pais . ' ' . $whatsapp);
    }

    $cnpj_raw = mb_candidatura_get_string($data, 'cnpj');
    $cnpj = mb_candidatura_normalize_cnpj($cnpj_raw);
    if ($cnpj === '' && $cnpj_raw !== '') {
        $cnpj = $cnpj_raw;
    }

    $lgpd = $data['lgpd'] ?? false;
    if ($lgpd === 'on' || $lgpd === 'true' || $lgpd === true || $lgpd === '1' || $lgpd === 1) {
        $lgpd = true;
    } else {
        $lgpd = false;
    }

    $form_step_raw = mb_candidatura_get_string($data, 'form_step');
    $form_step = $form_step_raw !== '' ? (int) $form_step_raw : (int) ($meta['formStep'] ?? 0);

    return [
        'leadId' => mb_candidatura_get_string($data, 'lead_id'),
        'email' => mb_candidatura_get_string($data, 'email'),
        'nome' => mb_candidatura_get_string($data, 'nome'),
        'telefone' => $telefone,
        'codigoPais' => $codigo_pais,
        'whatsapp' => $whatsapp,
        'empresa' => mb_candidatura_get_string($data, 'empresa'),
        'cnpj' => $cnpj,
        'cidade' => mb_candidatura_get_string($data, 'cidade'),
        'cargo' => mb_candidatura_get_string($data, 'cargo'),
        'faturamento' => mb_candidatura_get_string($data, 'faturamento'),
        'colaboradores' => mb_candidatura_get_string($data, 'colaboradores'),
        'objetivo' => mb_candidatura_get_string($data, 'objetivo'),
        'website' => mb_candidatura_get_string($data, 'website'),
        'eventoInteresse' => mb_candidatura_get_string($data, 'evento_interesse'),
        'intencao' => mb_candidatura_get_string($data, 'intencao') ?: 'membro',
        'momento' => mb_candidatura_get_string($data, 'momento'),
        'lgpd' => $lgpd,
        'source' => mb_candidatura_get_string($data, 'source') ?: ($meta['source'] ?? MB_LEAD_SOURCE_MASTERBOARD_SITE_CANDIDATURA),
        'referrer' => mb_candidatura_get_string($data, 'referrer') ?: ($meta['referrer'] ?? ''),
        'formStep' => $form_step,
        'timestamp' => $meta['timestamp'] ?? gmdate('c'),
    ];
}

function mb_candidatura_validate_draft_email(array $payload): array {
    $missing = [];
    if (empty($payload['email'])) {
        $missing[] = 'email';
    } elseif (!is_email($payload['email'])) {
        $missing[] = 'email válido';
    }

    return $missing;
}

function mb_candidatura_validate_step(int $step, array $payload): array {
    switch ($step) {
        case 1:
            return empty($payload['eventoInteresse']) ? ['evento_interesse'] : [];
        case 2:
            $missing = [];
            if (empty($payload['nome'])) {
                $missing[] = 'nome';
            }
            if (empty($payload['whatsapp']) && empty($payload['telefone'])) {
                $missing[] = 'telefone';
            }
            if (empty($payload['empresa'])) {
                $missing[] = 'empresa';
            }
            return $missing;
        case 3:
            return empty($payload['cargo']) ? ['cargo'] : [];
        case 4:
            return empty($payload['faturamento']) ? ['faturamento'] : [];
        case 5:
            return empty($payload['colaboradores']) ? ['colaboradores'] : [];
        case 6:
            return empty($payload['lgpd']) ? ['lgpd'] : [];
        default:
            return [];
    }
}

function mb_candidatura_validate_payload(array $payload): array {
    $missing = [];

    foreach (mb_candidatura_required_fields() as $field) {
        if (empty($payload[$field])) {
            $missing[] = $field;
        }
    }

    if (empty($payload['lgpd'])) {
        $missing[] = 'lgpd';
    }

    return $missing;
}

function mb_candidatura_score_lead(array $payload): int {
    $score = 0;

    if (preg_match('/sócio|fundador|presidente|ceo|c-level|vice-presidente/i', $payload['cargo'])) {
        $score += 35;
    } elseif (preg_match('/diretor/i', $payload['cargo'])) {
        $score += 24;
    } elseif (preg_match('/gerente/i', $payload['cargo'])) {
        $score += 12;
    }

    if (preg_match('/Acima de R\$500 milhões|De R\$50 a R\$500 milhões/i', $payload['faturamento'])) {
        $score += 35;
    } elseif (preg_match('/De R\$10 a R\$50 milhões/i', $payload['faturamento'])) {
        $score += 28;
    } elseif (preg_match('/De R\$5 a R\$10 milhões|De R\$1 milhão a R\$5 milhões/i', $payload['faturamento'])) {
        $score += 18;
    } elseif (preg_match('/De R\$500 mil a R\$1 milhão/i', $payload['faturamento'])) {
        $score += 8;
    }

    if (preg_match('/Acima de 1\.000|De 101 a 1\.000/i', $payload['colaboradores'])) {
        $score += 25;
    } elseif (preg_match('/De 51 a 100/i', $payload['colaboradores'])) {
        $score += 18;
    } elseif (preg_match('/De 10 a 50/i', $payload['colaboradores'])) {
        $score += 10;
    }

    if (!empty($payload['objetivo'])) {
        $score += 5;
    }

    if (!empty($payload['momento'])) {
        $score += 5;
    }

    return min($score, 100);
}

function mb_candidatura_priority_from_score(int $score): string {
    if ($score >= 70) {
        return 'high';
    }

    if ($score < 30) {
        return 'low';
    }

    return 'normal';
}

function mb_candidatura_nullable(string $value): ?string {
    return $value !== '' ? $value : null;
}

function mb_candidatura_qualification_notes(array $payload, int $score): string {
    return wp_json_encode([
        'intencao' => $payload['intencao'],
        'momento' => $payload['momento'],
        'faturamento' => $payload['faturamento'],
        'colaboradores' => $payload['colaboradores'],
        'codigo_pais' => $payload['codigoPais'],
        'whatsapp' => $payload['whatsapp'],
        'objetivo' => $payload['objetivo'],
        'cnpj' => !empty($payload['cnpj']) ? $payload['cnpj'] : null,
        'score' => $score,
        'priority' => mb_candidatura_priority_from_score($score),
        'source' => $payload['source'],
        'referrer' => $payload['referrer'],
    ]);
}

function mb_candidatura_to_draft_lead_row(array $payload, int $form_step): array {
    $score = mb_candidatura_score_lead($payload);

    return [
        'email' => $payload['email'],
        'name' => mb_candidatura_nullable($payload['nome']),
        'phone' => mb_candidatura_nullable($payload['telefone']),
        'company' => mb_candidatura_nullable($payload['empresa']),
        'role' => mb_candidatura_nullable($payload['cargo']),
        'city' => mb_candidatura_nullable($payload['cidade']),
        'cnpj' => mb_candidatura_nullable($payload['cnpj']),
        'lgpd_consent' => false,
        'source' => $payload['source'],
        'referrer' => mb_candidatura_nullable($payload['referrer']),
        'status' => 'draft',
        'intent' => $payload['intencao'] ?: 'membro',
        'company_moment' => mb_candidatura_nullable($payload['momento']),
        'annual_revenue' => mb_candidatura_nullable($payload['faturamento']),
        'employee_count' => mb_candidatura_nullable($payload['colaboradores']),
        'country_code' => mb_candidatura_nullable($payload['codigoPais']),
        'whatsapp' => mb_candidatura_nullable($payload['whatsapp']),
        'objective' => mb_candidatura_nullable($payload['objetivo']),
        'website' => mb_candidatura_nullable($payload['website']),
        'evento_interesse' => mb_candidatura_nullable($payload['eventoInteresse']),
        'form_step' => $form_step,
        'score' => $score,
        'priority' => mb_candidatura_priority_from_score($score),
        'notes' => mb_candidatura_qualification_notes($payload, $score),
        'submitted_at' => $payload['timestamp'],
    ];
}

function mb_candidatura_to_legacy_row(array $payload): array {
    $score = mb_candidatura_score_lead($payload);

    return [
        'name' => $payload['nome'],
        'email' => $payload['email'],
        'phone' => $payload['telefone'],
        'company' => $payload['empresa'],
        'role' => $payload['cargo'],
        'lgpd_consent' => $payload['lgpd'],
        'source' => $payload['source'],
        'referrer' => $payload['referrer'] !== '' ? $payload['referrer'] : null,
        'notes' => mb_candidatura_qualification_notes($payload, $score),
        'submitted_at' => $payload['timestamp'],
    ];
}

function mb_candidatura_to_lead_row(array $payload): array {
    $score = mb_candidatura_score_lead($payload);

    return array_merge(mb_candidatura_to_legacy_row($payload), [
        'city' => mb_candidatura_nullable($payload['cidade']),
        'cnpj' => mb_candidatura_nullable($payload['cnpj']),
        'status' => 'new',
        'intent' => $payload['intencao'],
        'company_moment' => mb_candidatura_nullable($payload['momento']),
        'annual_revenue' => $payload['faturamento'],
        'employee_count' => $payload['colaboradores'],
        'country_code' => $payload['codigoPais'],
        'whatsapp' => $payload['whatsapp'],
        'objective' => mb_candidatura_nullable($payload['objetivo']),
        'website' => mb_candidatura_nullable($payload['website']),
        'evento_interesse' => mb_candidatura_nullable($payload['eventoInteresse']),
        'form_step' => 6,
        'score' => $score,
        'priority' => mb_candidatura_priority_from_score($score),
    ]);
}

function mb_candidatura_config(): array {
    $url = defined('MASTERBOARD_SUPABASE_URL') ? MASTERBOARD_SUPABASE_URL : getenv('MASTERBOARD_SUPABASE_URL');
    $key = defined('MASTERBOARD_SUPABASE_SERVICE_ROLE_KEY')
        ? MASTERBOARD_SUPABASE_SERVICE_ROLE_KEY
        : getenv('MASTERBOARD_SUPABASE_SERVICE_ROLE_KEY');
    $webhook = defined('MASTERBOARD_LEAD_WEBHOOK_URL')
        ? MASTERBOARD_LEAD_WEBHOOK_URL
        : getenv('MASTERBOARD_LEAD_WEBHOOK_URL');

    return [
        'supabase_url' => is_string($url) ? rtrim(trim($url), '/') : '',
        'supabase_key' => is_string($key) ? trim($key) : '',
        'webhook_url' => is_string($webhook) ? trim($webhook) : '',
    ];
}

function mb_candidatura_log_error(string $message): void {
    if (function_exists('error_log')) {
        error_log('[masterboard-candidatura] ' . $message);
    }
}

function mb_candidatura_supabase_headers(array $config, string $prefer = ''): array {
    $headers = [
        'apikey' => $config['supabase_key'],
        'Authorization' => 'Bearer ' . $config['supabase_key'],
        'Content-Type' => 'application/json',
    ];

    if ($prefer !== '') {
        $headers['Prefer'] = $prefer;
    }

    return $headers;
}

function mb_candidatura_supabase_configured(): array {
    $config = mb_candidatura_config();

    if ($config['supabase_url'] === '' || $config['supabase_key'] === '') {
        mb_candidatura_log_error('Supabase não configurado no wp-config.php.');
        return [
            'ok' => false,
            'error' => 'Supabase não configurado. Defina MASTERBOARD_SUPABASE_URL e MASTERBOARD_SUPABASE_SERVICE_ROLE_KEY em wp-config.php.',
            'code' => 'supabase_not_configured',
        ];
    }

    if (strlen($config['supabase_key']) < 100) {
        mb_candidatura_log_error('Service role key parece incompleta (tamanho ' . strlen($config['supabase_key']) . ').');
        return [
            'ok' => false,
            'error' => 'Chave service_role incompleta no wp-config.php.',
            'code' => 'supabase_invalid_key',
        ];
    }

    return ['ok' => true, 'config' => $config];
}

function mb_candidatura_supabase_request(string $method, string $path, ?array $body = null, string $prefer = ''): array {
    $ready = mb_candidatura_supabase_configured();
    if (!$ready['ok']) {
        return $ready;
    }

    $config = $ready['config'];
    $args = [
        'method' => $method,
        'timeout' => 20,
        'headers' => mb_candidatura_supabase_headers($config, $prefer),
    ];

    if ($body !== null) {
        $args['body'] = wp_json_encode($body);
    }

    $response = wp_remote_request($config['supabase_url'] . $path, $args);
    if (is_wp_error($response)) {
        mb_candidatura_log_error('Supabase request falhou: ' . $response->get_error_message());
        return ['ok' => false, 'error' => $response->get_error_message(), 'code' => 'http_request_failed'];
    }

    $status = wp_remote_retrieve_response_code($response);
    $decoded = json_decode(wp_remote_retrieve_body($response), true);

    if ($status < 200 || $status >= 300) {
        $message = is_array($decoded) && isset($decoded['message']) ? $decoded['message'] : 'Falha na requisição Supabase.';
        mb_candidatura_log_error('Supabase respondeu ' . $status . ': ' . $message);
        return ['ok' => false, 'error' => $message, 'code' => 'supabase_request_failed', 'status' => $status];
    }

    return ['ok' => true, 'data' => $decoded, 'status' => $status];
}

function mb_candidatura_record_activity(string $lead_id, string $type, string $description, array $metadata = []): void {
    mb_candidatura_supabase_request(
        'POST',
        '/rest/v1/lead_activities',
        [
            'lead_id' => $lead_id,
            'type' => $type,
            'description' => $description,
            'metadata' => $metadata,
        ]
    );
}

function mb_candidatura_find_draft_by_email(string $email): array {
    $ready = mb_candidatura_supabase_configured();
    if (!$ready['ok']) {
        return $ready;
    }

    $config = $ready['config'];
    $query = '/rest/v1/leads?select=id,email,status&status=eq.draft&email=ilike.' . rawurlencode($email) . '&limit=1';
    $response = wp_remote_get(
        $config['supabase_url'] . $query,
        [
            'timeout' => 20,
            'headers' => mb_candidatura_supabase_headers($config),
        ]
    );

    if (is_wp_error($response)) {
        return ['ok' => false, 'error' => $response->get_error_message(), 'code' => 'http_request_failed'];
    }

    $status = wp_remote_retrieve_response_code($response);
    $body = json_decode(wp_remote_retrieve_body($response), true);
    if ($status < 200 || $status >= 300) {
        return ['ok' => false, 'error' => 'Falha ao buscar rascunho.', 'code' => 'supabase_request_failed', 'status' => $status];
    }

    $lead = is_array($body) && isset($body[0]) ? $body[0] : null;
    return ['ok' => true, 'lead' => $lead];
}

function mb_candidatura_get_lead_by_id(string $lead_id): array {
    $result = mb_candidatura_supabase_request(
        'GET',
        '/rest/v1/leads?select=id,email,status&id=eq.' . rawurlencode($lead_id) . '&limit=1'
    );

    if (!$result['ok']) {
        return $result;
    }

    $lead = is_array($result['data']) && isset($result['data'][0]) ? $result['data'][0] : null;
    return ['ok' => true, 'lead' => $lead];
}

function mb_candidatura_insert_supabase(array $row): array {
    $result = mb_candidatura_supabase_request('POST', '/rest/v1/leads', $row, 'return=representation');
    if (!$result['ok']) {
        return $result;
    }

    $lead_id = is_array($result['data']) && isset($result['data'][0]['id']) ? $result['data'][0]['id'] : null;
    if ($lead_id) {
        mb_candidatura_record_activity($lead_id, 'created', 'Candidatura recebida pelo site', [
            'source' => $row['source'] ?? MB_LEAD_SOURCE_MASTERBOARD_SITE_CANDIDATURA,
            'score' => $row['score'] ?? null,
            'priority' => $row['priority'] ?? null,
        ]);
    }

    return ['ok' => true, 'lead_id' => $lead_id];
}

function mb_candidatura_update_supabase_lead(string $lead_id, array $row, string $expected_status = 'draft'): array {
    $path = '/rest/v1/leads?id=eq.' . rawurlencode($lead_id) . '&status=eq.' . rawurlencode($expected_status);
    $result = mb_candidatura_supabase_request('PATCH', $path, $row, 'return=representation');
    if (!$result['ok']) {
        return $result;
    }

    $updated_id = is_array($result['data']) && isset($result['data'][0]['id']) ? $result['data'][0]['id'] : $lead_id;
    return ['ok' => true, 'lead_id' => $updated_id];
}

function mb_candidatura_forward_webhook(array $payload): void {
    $config = mb_candidatura_config();

    if ($config['webhook_url'] === '') {
        return;
    }

    wp_remote_post(
        $config['webhook_url'],
        [
            'timeout' => 15,
            'headers' => ['Content-Type' => 'application/json'],
            'body' => wp_json_encode($payload),
        ]
    );
}
