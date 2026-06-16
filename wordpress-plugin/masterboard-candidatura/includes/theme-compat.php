<?php

if (!defined('ABSPATH')) {
    exit;
}

function mb_candidatura_is_candidatura_page(): bool {
    return is_page('candidatura');
}

function mb_candidatura_configure_page(int $page_id): void {
    update_post_meta($page_id, 'us_titlebar_id', '0');
    update_post_meta($page_id, 'us_titlebar', 'hide');
}

function mb_candidatura_get_page_id(): ?int {
    $page = get_page_by_path('candidatura');
    return $page instanceof WP_Post ? (int) $page->ID : null;
}

function mb_candidatura_hide_titlebar($area_id, $area) {
    if ($area === 'titlebar' && mb_candidatura_is_candidatura_page()) {
        return false;
    }

    return $area_id;
}

function mb_candidatura_body_class(array $classes): array {
    if (mb_candidatura_is_candidatura_page()) {
        $classes[] = 'mb-candidatura-hide-titlebar';
    }

    return $classes;
}

function mb_candidatura_titlebar_css(): void {
    if (!mb_candidatura_is_candidatura_page()) {
        return;
    }

    if (!wp_style_is('masterboard-candidatura', 'enqueued')) {
        wp_enqueue_style('masterboard-candidatura');
    }

    $css = '
        body.mb-candidatura-hide-titlebar .l-titlebar,
        body.mb-candidatura-hide-titlebar .l-section.type_sticky:first-of-type + .l-titlebar,
        body.mb-candidatura-hide-titlebar .g-breadcrumbs,
        body.mb-candidatura-hide-titlebar .l-main .l-section.color_light:first-child {
            display: none !important;
        }

        body.mb-candidatura-hide-titlebar .l-main {
            padding-top: 0 !important;
        }
    ';

    wp_add_inline_style('masterboard-candidatura', $css);
}

function mb_candidatura_bootstrap_theme_compat(): void {
    add_filter('us_get_page_area_id', 'mb_candidatura_hide_titlebar', 20, 2);
    add_filter('body_class', 'mb_candidatura_body_class');

    $page_id = mb_candidatura_get_page_id();
    if ($page_id && get_post_meta($page_id, 'us_titlebar_id', true) !== '0') {
        mb_candidatura_configure_page($page_id);
    }
}
