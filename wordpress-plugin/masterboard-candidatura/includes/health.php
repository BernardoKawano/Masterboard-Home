<?php

if (!defined('ABSPATH')) {
    exit;
}

function mb_candidatura_register_health_route(): void {
    register_rest_route('masterboard/v1', '/health', [
        'methods' => 'GET',
        'callback' => 'mb_candidatura_health_check',
        'permission_callback' => '__return_true',
    ]);
}

function mb_candidatura_health_check() {
    $config = mb_candidatura_config();
    $configured = $config['supabase_url'] !== '' && $config['supabase_key'] !== '';

    $health = [
        'plugin' => 'masterboard-candidatura',
        'version' => MB_CANDIDATURA_VERSION,
        'supabaseConfigured' => $configured,
        'supabaseUrl' => $configured ? $config['supabase_url'] : null,
        'serviceRoleLength' => $configured ? strlen($config['supabase_key']) : 0,
        'supabaseReachable' => false,
        'supabaseStatus' => null,
        'supabaseError' => null,
    ];

    if (!$configured) {
        return new WP_REST_Response($health, 200);
    }

    $response = wp_remote_get(
        rtrim($config['supabase_url'], '/') . '/rest/v1/',
        [
            'timeout' => 15,
            'headers' => [
                'apikey' => $config['supabase_key'],
                'Authorization' => 'Bearer ' . $config['supabase_key'],
            ],
        ]
    );

    if (is_wp_error($response)) {
        $health['supabaseError'] = $response->get_error_message();
        return new WP_REST_Response($health, 200);
    }

    $health['supabaseStatus'] = wp_remote_retrieve_response_code($response);
    $health['supabaseReachable'] = $health['supabaseStatus'] >= 200 && $health['supabaseStatus'] < 500;

    return new WP_REST_Response($health, 200);
}
