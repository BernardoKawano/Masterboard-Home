<?php
/**
 * Masterboard child theme customizations.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'wp_enqueue_scripts', function () {
	wp_enqueue_style(
		'masterboard-child-custom',
		get_stylesheet_directory_uri() . '/assets/css/custom.css',
		array(),
		'0.1.0'
	);

	wp_enqueue_script(
		'masterboard-child-custom',
		get_stylesheet_directory_uri() . '/assets/js/custom.js',
		array(),
		'0.1.0',
		true
	);
}, 20 );

add_shortcode( 'masterboard_manual_section', function () {
	ob_start();
	?>
	<section class="mb-manual-section" data-masterboard-manual-section>
		<div class="mb-manual-section__content">
			<p class="mb-manual-section__eyebrow">// MASTERBOARD</p>
			<h2>HTML, CSS e JavaScript na mao.</h2>
			<p>
				Este bloco vem do child theme e pode ser editado direto no Cursor.
			</p>
			<button class="mb-manual-section__button modal-club" type="button">
				Faca parte do club
			</button>
		</div>
	</section>
	<?php
	return ob_get_clean();
} );
