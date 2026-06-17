<?php
/**
 * Plugin Name: Masterboard Candidatura
 * Description: Formulário multi-etapas de candidatura ao Club Masterboard, com gravação em Supabase.
 * Version: 1.1.3
 * Author: Masterboard
 * Text Domain: masterboard-candidatura
 */

if (!defined('ABSPATH')) {
    exit;
}

define('MB_CANDIDATURA_VERSION', '1.1.3');
define('MB_CANDIDATURA_PATH', plugin_dir_path(__FILE__));
define('MB_CANDIDATURA_URL', plugin_dir_url(__FILE__));

require_once MB_CANDIDATURA_PATH . 'includes/lead-source.php';
require_once MB_CANDIDATURA_PATH . 'includes/candidatura-payload.php';
require_once MB_CANDIDATURA_PATH . 'includes/health.php';
require_once MB_CANDIDATURA_PATH . 'includes/rest-api.php';
require_once MB_CANDIDATURA_PATH . 'includes/theme-compat.php';

final class Masterboard_Candidatura_Plugin {
    private static bool $script_config_added = false;

    public static function init(): void {
        add_action('init', [self::class, 'register_shortcode']);
        add_action('wp_enqueue_scripts', [self::class, 'enqueue_page_assets']);
        add_action('wp_enqueue_scripts', [self::class, 'enqueue_cta_redirect']);
        add_action('rest_api_init', 'mb_candidatura_register_health_route');
        add_action('rest_api_init', 'mb_candidatura_register_rest_routes');
        add_action('init', 'mb_candidatura_bootstrap_theme_compat');
        register_activation_hook(__FILE__, [self::class, 'activate']);
    }

    public static function activate(): void {
        $page = get_page_by_path('candidatura');

        if (!$page) {
            $page_id = wp_insert_post([
                'post_title' => 'Candidatura',
                'post_name' => 'candidatura',
                'post_status' => 'publish',
                'post_type' => 'page',
                'post_content' => '[masterboard_candidatura]',
            ]);
        } else {
            $page_id = (int) $page->ID;
        }

        if (!empty($page_id) && !is_wp_error($page_id)) {
            mb_candidatura_configure_page((int) $page_id);
        }
    }

    public static function register_shortcode(): void {
        add_shortcode('masterboard_candidatura', [self::class, 'render_shortcode']);
    }

    public static function enqueue_cta_redirect(): void {
        wp_enqueue_script(
            'masterboard-candidatura-cta',
            MB_CANDIDATURA_URL . 'assets/cta-redirect.js',
            [],
            MB_CANDIDATURA_VERSION,
            true
        );

        wp_localize_script('masterboard-candidatura-cta', 'MasterboardCandidaturaCta', [
            'candidaturaUrl' => home_url('/candidatura/'),
        ]);
    }

    public static function enqueue_page_assets(): void {
        self::register_assets();

        if (!is_page('candidatura')) {
            return;
        }

        wp_enqueue_style('masterboard-candidatura');
        wp_enqueue_script('masterboard-candidatura');
        self::localize_candidatura_script();

        mb_candidatura_titlebar_css();
    }

    private static function script_config(): array {
        return [
            'restUrl' => rest_url('masterboard/v1/candidatura'),
            'draftUrl' => rest_url('masterboard/v1/candidatura/draft'),
            'cnpjUrl' => rest_url('masterboard/v1/cnpj/'),
            'nonce' => wp_create_nonce('wp_rest'),
            'privacyUrl' => home_url('/politica-de-privacidade/'),
            'homeUrl' => home_url('/'),
        ];
    }

    private static function localize_candidatura_script(): void {
        if (self::$script_config_added) {
            return;
        }

        self::$script_config_added = true;
        wp_localize_script('masterboard-candidatura', 'MasterboardCandidatura', self::script_config());
    }

    public static function register_assets(): void {
        wp_register_style(
            'masterboard-candidatura',
            MB_CANDIDATURA_URL . 'assets/candidatura.css',
            [],
            MB_CANDIDATURA_VERSION
        );

        wp_register_script(
            'masterboard-candidatura',
            MB_CANDIDATURA_URL . 'assets/candidatura.js',
            [],
            MB_CANDIDATURA_VERSION,
            true
        );
    }

    public static function render_shortcode(): string {
        wp_enqueue_style('masterboard-candidatura');
        wp_enqueue_script('masterboard-candidatura');
        self::localize_candidatura_script();

        mb_candidatura_titlebar_css();

        ob_start();
        include MB_CANDIDATURA_PATH . 'templates/form.php';
        return (string) ob_get_clean();
    }
}

Masterboard_Candidatura_Plugin::init();
