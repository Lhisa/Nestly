INSERT INTO categoria (nom)
VALUES
    ('Roba'),
    ('Higiene i cura'),
    ('De passeig'),
    ('Alimentació'),
    ('Bossa hospital Mare'),
    ('Mobles'),
    ('Entreteniment'),
    ('Pendent de classificar');

    INSERT INTO subcategoria (nom, categoria_id)
SELECT dades.subcategoria, categoria.id
FROM (
    VALUES
        ('Roba', 'Bodies'),
        ('Roba', 'Primera posta'),
        ('Roba', 'Mitjons'),
        ('Roba', 'Malles'),
        ('Roba', 'Vestit'),
        ('Roba', 'Pijama'),
        ('Roba', 'Texans'),
        ('Roba', 'Samarreta'),
        ('Roba', 'Jersei'),
        ('Roba', 'Anorac'),

        ('Higiene i cura', 'Arrullos'),
        ('Higiene i cura', 'Sabó del cos'),
        ('Higiene i cura', 'Crema hidratant'),
        ('Higiene i cura', 'Crema del culet'),
        ('Higiene i cura', 'Oli hidratant'),
        ('Higiene i cura', 'Banyera'),
        ('Higiene i cura', 'Joguines pel bany'),
        ('Higiene i cura', 'Tallaungles'),

        ('De passeig', 'Cotxet'),
        ('De passeig', 'Bossa de passeig'),
        ('De passeig', 'Sac'),
        ('De passeig', 'Cadira del cotxe'),
        ('De passeig', 'Funda de cadireta'),

        ('Alimentació', 'Trona'),
        ('Alimentació', 'Biberons'),
        ('Alimentació', 'Pitets'),
        ('Alimentació', 'Vaixella'),
        ('Alimentació', 'Esterilitzador de biberons'),

        ('Bossa hospital Mare', 'Bates'),
        ('Bossa hospital Mare', 'Sabatilles'),
        ('Bossa hospital Mare', 'Maleta'),
        ('Bossa hospital Mare', 'Calces de cotó'),
        ('Bossa hospital Mare', 'Compreses'),
        ('Bossa hospital Mare', 'Sostenidors de lactància'),
        ('Bossa hospital Mare', 'Mugroneres'),

        ('Mobles', 'Colecho'),
        ('Mobles', 'Bressol/llit evolutiu'),
        ('Mobles', 'Canviador'),

        ('Entreteniment', 'Llibres'),
        ('Entreteniment', 'Joguines'),

        ('Pendent de classificar', 'Pendent de classificar')
) AS dades(categoria, subcategoria)
LEFT JOIN categoria
    ON categoria.nom = dades.categoria;