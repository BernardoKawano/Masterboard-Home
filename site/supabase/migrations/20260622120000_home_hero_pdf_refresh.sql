-- Atualiza copy do hero conforme refresh do site (PDF jun/2026).
-- Seguro para reexecutar: só altera chaves home.hero.* existentes.

UPDATE site_settings SET value = '', updated_by = 'migration', updated_at = now()
WHERE key IN ('home.hero.eyebrow', 'home.hero.pill', 'home.hero.line3');

UPDATE site_settings SET value = 'Ecossistema empresarial', updated_by = 'migration', updated_at = now()
WHERE key = 'home.hero.line1';

UPDATE site_settings SET value = 'de educação', updated_by = 'migration', updated_at = now()
WHERE key = 'home.hero.line2';

UPDATE site_settings SET value = 'e negócios', updated_by = 'migration', updated_at = now()
WHERE key = 'home.hero.highlight';

UPDATE site_settings SET value = 'Reunimos métodos, experiências e aprendizados de grandes executivos que construíram resultados em empresas como Microsoft, Salesforce, Amazon, SAP, Azul e Wellhub para ajudar empresários a tomar melhores decisões, desenvolver seus times e construir negócios preparados para crescer.', updated_by = 'migration', updated_at = now()
WHERE key = 'home.hero.description';

UPDATE site_settings SET value = 'Quero participar', updated_by = 'migration', updated_at = now()
WHERE key = 'home.hero.primaryCtaLabel';

UPDATE site_settings SET value = '/aplicacao/', updated_by = 'migration', updated_at = now()
WHERE key = 'home.hero.primaryCtaHref';
