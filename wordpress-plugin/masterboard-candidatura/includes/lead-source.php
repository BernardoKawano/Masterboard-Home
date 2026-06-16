<?php

if (!defined('ABSPATH')) {
    exit;
}

const MB_LEAD_SOURCE_MASTERBOARD_SITE_CANDIDATURA = 'masterboard:site:candidatura';
const MB_LEAD_SOURCE_MASTERBOARD_SITE_CTA = 'masterboard:site:cta';
const MB_LEAD_SOURCE_MASTERBOARD_SITE_EVENTO = 'masterboard:site:evento';
const MB_LEAD_SOURCE_MASTERBOARD_APP = 'masterboard:app:signup';
const MB_LEAD_SOURCE_MASTERBOARD_WHATSAPP = 'masterboard:whatsapp:inbound';

const MB_LEAD_SOURCE_SCALE_SITE_CANDIDATURA = 'scale:site:candidatura';
const MB_LEAD_SOURCE_SCALE_SITE_CTA = 'scale:site:cta';
const MB_LEAD_SOURCE_SCALE_SITE_EVENTO = 'scale:site:evento';
const MB_LEAD_SOURCE_SCALE_APP = 'scale:app:signup';
const MB_LEAD_SOURCE_SCALE_WHATSAPP = 'scale:whatsapp:inbound';

function mb_lead_source_legacy_masterboard_sources(): array {
    return ['candidatura-page', 'site-candidatura'];
}

function mb_lead_source_parse(?string $source): array {
    $raw = is_string($source) ? trim($source) : '';

    if ($raw === '') {
        return ['raw' => '', 'brand' => 'unknown', 'channel' => '', 'detail' => ''];
    }

    if (in_array($raw, mb_lead_source_legacy_masterboard_sources(), true)) {
        return ['raw' => $raw, 'brand' => 'masterboard', 'channel' => 'site', 'detail' => 'candidatura'];
    }

    $parts = explode(':', $raw, 3);
    $brand = $parts[0] ?? '';
    $channel = $parts[1] ?? '';
    $detail = $parts[2] ?? '';
    $normalizedBrand = in_array($brand, ['masterboard', 'scale'], true) ? $brand : 'unknown';

    return [
        'raw' => $raw,
        'brand' => $normalizedBrand,
        'channel' => $channel,
        'detail' => $detail,
    ];
}
