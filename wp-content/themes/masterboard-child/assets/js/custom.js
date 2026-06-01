(function () {
	'use strict';

	document.addEventListener('DOMContentLoaded', function () {
		document
			.querySelectorAll('[data-masterboard-manual-section]')
			.forEach(function (section) {
				section.classList.add('is-ready');
			});
	});
})();
