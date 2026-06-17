<?php

if (!defined('ABSPATH')) {
    exit;
}

function mb_candidatura_normalize_cnpj(string $value): string {
    $digits = preg_replace('/\D+/', '', $value) ?? '';
    return strlen($digits) === 14 ? $digits : '';
}

function mb_candidatura_format_cnpj(string $digits): string {
    $normalized = mb_candidatura_normalize_cnpj($digits);
    if ($normalized === '') {
        return '';
    }

    return preg_replace(
        '/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/',
        '$1.$2.$3/$4-$5',
        $normalized
    ) ?? $normalized;
}

function mb_candidatura_map_brasil_api_cnpj($data): ?array {
    if (!is_array($data)) {
        return null;
    }

    $razao_social = isset($data['razao_social']) && is_string($data['razao_social']) ? trim($data['razao_social']) : '';
    $nome_fantasia = isset($data['nome_fantasia']) && is_string($data['nome_fantasia']) ? trim($data['nome_fantasia']) : '';
    $municipio = isset($data['municipio']) && is_string($data['municipio']) ? trim($data['municipio']) : '';
    $uf = isset($data['uf']) && is_string($data['uf']) ? trim($data['uf']) : '';
    $situacao = isset($data['descricao_situacao_cadastral']) && is_string($data['descricao_situacao_cadastral'])
        ? trim($data['descricao_situacao_cadastral'])
        : '';

    $empresa = $nome_fantasia !== '' ? $nome_fantasia : $razao_social;
    $city = $municipio !== '' && $uf !== '' ? $municipio . ' — ' . $uf : ($municipio !== '' ? $municipio : $uf);

    return [
        'razaoSocial' => $razao_social,
        'nomeFantasia' => $nome_fantasia,
        'empresa' => $empresa,
        'municipio' => $municipio,
        'uf' => $uf,
        'city' => $city,
        'situacaoCadastral' => $situacao,
    ];
}

function mb_candidatura_fetch_cnpj(string $cnpj): array {
    $normalized = mb_candidatura_normalize_cnpj($cnpj);
    if ($normalized === '') {
        return ['ok' => false, 'status' => 400, 'error' => 'CNPJ inválido'];
    }

    $response = wp_remote_get(
        'https://brasilapi.com.br/api/cnpj/v1/' . rawurlencode($normalized),
        [
            'timeout' => 8,
            'headers' => ['Accept' => 'application/json'],
        ]
    );

    if (is_wp_error($response)) {
        return ['ok' => false, 'status' => 500, 'error' => 'Erro ao consultar CNPJ'];
    }

    $status = wp_remote_retrieve_response_code($response);
    if ($status === 404) {
        return ['ok' => false, 'status' => 404, 'error' => 'CNPJ não encontrado'];
    }

    if ($status < 200 || $status >= 300) {
        return ['ok' => false, 'status' => 502, 'error' => 'Não foi possível consultar o CNPJ'];
    }

    $body = json_decode(wp_remote_retrieve_body($response), true);
    $mapped = mb_candidatura_map_brasil_api_cnpj($body);
    if (!$mapped || empty($mapped['empresa'])) {
        return ['ok' => false, 'status' => 502, 'error' => 'Dados do CNPJ indisponíveis'];
    }

    return [
        'ok' => true,
        'status' => 200,
        'data' => array_merge(['cnpj' => $normalized], $mapped),
    ];
}
