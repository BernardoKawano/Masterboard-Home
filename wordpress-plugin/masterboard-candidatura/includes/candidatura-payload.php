<?php

if (!defined('ABSPATH')) {
    exit;
}

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

    $lgpd = $data['lgpd'] ?? false;
    if ($lgpd === 'on' || $lgpd === 'true' || $lgpd === true || $lgpd === '1' || $lgpd === 1) {
        $lgpd = true;
    } else {
        $lgpd = false;
    }

    return [
        'email' => mb_candidatura_get_string($data, 'email'),
        'nome' => mb_candidatura_get_string($data, 'nome'),
        'telefone' => $telefone,
        'codigoPais' => $codigo_pais,
        'whatsapp' => $whatsapp,
        'empresa' => mb_candidatura_get_string($data, 'empresa'),
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
        'timestamp' => $meta['timestamp'] ?? gmdate('c'),
    ];
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

function mb_candidatura_qualification_notes(array $payload, int $score): string {
    return wp_json_encode([
        'intencao' => $payload['intencao'],
        'momento' => $payload['momento'],
        'faturamento' => $payload['faturamento'],
        'colaboradores' => $payload['colaboradores'],
        'codigo_pais' => $payload['codigoPais'],
        'whatsapp' => $payload['whatsapp'],
        'objetivo' => $payload['objetivo'],
        'score' => $score,
        'priority' => mb_candidatura_priority_from_score($score),
        'source' => $payload['source'],
        'referrer' => $payload['referrer'],
    ]);
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
        'intent' => $payload['intencao'],
        'company_moment' => $payload['momento'] !== '' ? $payload['momento'] : null,
        'annual_revenue' => $payload['faturamento'],
        'employee_count' => $payload['colaboradores'],
        'country_code' => $payload['codigoPais'],
        'whatsapp' => $payload['whatsapp'],
        'objective' => $payload['objetivo'] !== '' ? $payload['objetivo'] : null,
        'website' => $payload['website'] !== '' ? $payload['website'] : null,
        'evento_interesse' => $payload['eventoInteresse'] !== '' ? $payload['eventoInteresse'] : null,
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

function mb_candidatura_insert_supabase(array $row): array {
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

    $response = wp_remote_post(
        $config['supabase_url'] . '/rest/v1/leads',
        [
            'timeout' => 20,
            'headers' => [
                'apikey' => $config['supabase_key'],
                'Authorization' => 'Bearer ' . $config['supabase_key'],
                'Content-Type' => 'application/json',
                'Prefer' => 'return=representation',
            ],
            'body' => wp_json_encode($row),
        ]
    );

    if (is_wp_error($response)) {
        mb_candidatura_log_error('wp_remote_post falhou: ' . $response->get_error_message());
        return ['ok' => false, 'error' => $response->get_error_message(), 'code' => 'http_request_failed'];
    }

    $status = wp_remote_retrieve_response_code($response);
    $body = json_decode(wp_remote_retrieve_body($response), true);

    if ($status < 200 || $status >= 300) {
        $message = is_array($body) && isset($body['message']) ? $body['message'] : 'Falha ao gravar lead no Supabase.';
        mb_candidatura_log_error('Supabase respondeu ' . $status . ': ' . $message);
        return ['ok' => false, 'error' => $message, 'code' => 'supabase_insert_failed', 'status' => $status];
    }

    $lead_id = is_array($body) && isset($body[0]['id']) ? $body[0]['id'] : null;

    if ($lead_id) {
        wp_remote_post(
            $config['supabase_url'] . '/rest/v1/lead_activities',
            [
                'timeout' => 20,
                'headers' => [
                    'apikey' => $config['supabase_key'],
                    'Authorization' => 'Bearer ' . $config['supabase_key'],
                    'Content-Type' => 'application/json',
                ],
                'body' => wp_json_encode([
                    'lead_id' => $lead_id,
                    'type' => 'created',
                    'description' => 'Candidatura recebida pelo site',
                    'metadata' => [
                        'source' => $row['source'] ?? MB_LEAD_SOURCE_MASTERBOARD_SITE_CANDIDATURA,
                        'score' => $row['score'] ?? null,
                        'priority' => $row['priority'] ?? null,
                    ],
                ]),
            ]
        );
    }

    return ['ok' => true, 'lead_id' => $lead_id];
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
