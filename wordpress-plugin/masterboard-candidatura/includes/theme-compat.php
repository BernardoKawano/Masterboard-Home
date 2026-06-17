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
    update_post_meta($page_id, 'us_sidebar_id', '0');
    update_post_meta($page_id, 'us_sidebar', 'hide');
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
        html body.mb-candidatura-hide-titlebar {
            margin: 0 !important;
            background: #0a0a0a !important;
        }

        body.mb-candidatura-hide-titlebar {
            background: #0a0a0a !important;
        }

        body.mb-candidatura-hide-titlebar .l-titlebar,
        body.mb-candidatura-hide-titlebar .l-section.type_sticky:first-of-type + .l-titlebar,
        body.mb-candidatura-hide-titlebar .g-breadcrumbs,
        body.mb-candidatura-hide-titlebar .l-main .l-section.color_light:first-child {
            display: none !important;
        }

        body.mb-candidatura-hide-titlebar .l-canvas {
            background: #0a0a0a !important;
            padding-top: 0 !important;
        }

        body.mb-candidatura-hide-titlebar #page-content,
        body.mb-candidatura-hide-titlebar .l-main,
        body.mb-candidatura-hide-titlebar .l-main .l-section,
        body.mb-candidatura-hide-titlebar .l-section-h,
        body.mb-candidatura-hide-titlebar .g-cols,
        body.mb-candidatura-hide-titlebar .vc_row,
        body.mb-candidatura-hide-titlebar .vc_column_container,
        body.mb-candidatura-hide-titlebar .vc_column-inner,
        body.mb-candidatura-hide-titlebar .wpb_wrapper {
            background: transparent !important;
            box-shadow: none !important;
        }

        body.mb-candidatura-hide-titlebar #page-content,
        body.mb-candidatura-hide-titlebar .l-main,
        body.mb-candidatura-hide-titlebar.headerinpos_top .l-main,
        body.mb-candidatura-hide-titlebar.header_hor .l-main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: none !important;
            width: 100% !important;
        }

        body.mb-candidatura-hide-titlebar .l-main > .l-section,
        body.mb-candidatura-hide-titlebar .l-main > .l-section.height_medium,
        body.mb-candidatura-hide-titlebar .l-main > .l-section .l-section-h {
            padding-top: 0 !important;
            padding-bottom: 0 !important;
            margin-top: 0 !important;
            margin-bottom: 0 !important;
            min-height: 0 !important;
        }

        body.mb-candidatura-hide-titlebar .l-main > .l-section,
        body.mb-candidatura-hide-titlebar .l-section-h,
        body.mb-candidatura-hide-titlebar .g-cols,
        body.mb-candidatura-hide-titlebar .vc_row,
        body.mb-candidatura-hide-titlebar .vc_column_container,
        body.mb-candidatura-hide-titlebar .vc_column-inner,
        body.mb-candidatura-hide-titlebar .wpb_wrapper {
            padding-left: 0 !important;
            padding-right: 0 !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            max-width: none !important;
            width: 100% !important;
        }

        body.mb-candidatura-hide-titlebar .mb-candidatura-page {
            width: 100%;
            max-width: 100%;
            margin: 0;
            padding-top: 5px;
        }
    ';

    wp_add_inline_style('masterboard-candidatura', $css);
}

function mb_candidatura_bootstrap_theme_compat(): void {
    add_filter('us_get_page_area_id', 'mb_candidatura_hide_titlebar', 20, 2);
    add_filter('body_class', 'mb_candidatura_body_class');

    $page_id = mb_candidatura_get_page_id();
    if ($page_id) {
        mb_candidatura_configure_page($page_id);
    }
}
