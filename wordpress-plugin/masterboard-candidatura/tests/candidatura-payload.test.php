<?php

require_once __DIR__ . '/../includes/candidatura-payload.php';

function mb_candidatura_assert(bool $condition, string $message): void {
    if (!$condition) {
        fwrite(STDERR, $message . PHP_EOL);
        exit(1);
    }
}

$data = [
    'email' => ' lider@empresa.com ',
    'nome' => 'Ana Lider',
    'codigo_pais' => '+55',
    'whatsapp' => '11 99999-9999',
    'empresa' => 'Empresa Forte',
    'cargo' => 'Presidente ou CEO',
    'faturamento' => 'De R$10 a R$50 milhões ao ano',
    'colaboradores' => 'De 101 a 1.000 colaboradores',
    'objetivo' => 'Entrar em uma sala com pares certos',
    'momento' => 'crescimento',
    'lgpd' => 'on',
];

$payload = mb_candidatura_build_payload($data, [
    'source' => 'test',
    'referrer' => 'https://masterboard.com.br/',
    'timestamp' => '2026-06-10T12:00:00.000Z',
]);

mb_candidatura_assert(mb_candidatura_validate_payload($payload) === [], 'payload should be valid');
mb_candidatura_assert($payload['email'] === 'lider@empresa.com', 'email trim');
mb_candidatura_assert($payload['telefone'] === '+55 11 99999-9999', 'telefone');
mb_candidatura_assert($payload['intencao'] === 'membro', 'intencao');

$row = mb_candidatura_to_lead_row($payload);
mb_candidatura_assert($row['name'] === 'Ana Lider', 'name');
mb_candidatura_assert($row['status'] === 'new', 'status');
mb_candidatura_assert($row['priority'] === 'high', 'priority');
mb_candidatura_assert($row['score'] === mb_candidatura_score_lead($payload), 'score');

$incomplete = ['email' => 'lead@empresa.com'];
$missing = mb_candidatura_validate_payload(mb_candidatura_build_payload($incomplete));
mb_candidatura_assert(
    $missing === ['nome', 'telefone', 'empresa', 'cargo', 'faturamento', 'colaboradores', 'lgpd'],
    'missing fields'
);

mb_candidatura_assert(
    mb_candidatura_validate_step(1, ['eventoInteresse' => 'Masterboard Club — Curitiba']) === [],
    'step 1 valid'
);
mb_candidatura_assert(mb_candidatura_normalize_cnpj('12.345.678/0001-99') === '12345678000199', 'cnpj normalize');

echo "candidatura-payload-php: ok\n";
