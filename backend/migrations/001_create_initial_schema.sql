CREATE TABLE categoria (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nom VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE subcategoria (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    categoria_id INTEGER NOT NULL,

    CONSTRAINT uq_subcategoria_categoria_nom
        UNIQUE (categoria_id, nom),

    CONSTRAINT fk_subcategoria_categoria
        FOREIGN KEY (categoria_id)
        REFERENCES categoria(id)
        ON DELETE RESTRICT
);

CREATE TABLE recomanacio (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    subcategoria_id INTEGER NOT NULL UNIQUE,
    quantitat_recomanada INTEGER NOT NULL,

    CONSTRAINT chk_recomanacio_quantitat_positiva
        CHECK (quantitat_recomanada > 0),

    CONSTRAINT fk_recomanacio_subcategoria
        FOREIGN KEY (subcategoria_id)
        REFERENCES subcategoria(id)
        ON DELETE CASCADE
);

CREATE TABLE botiga (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    url TEXT
);

CREATE TABLE llista_nado (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    descripcio TEXT,
    botiga_id INTEGER NOT NULL UNIQUE,

    CONSTRAINT fk_llista_nado_botiga
        FOREIGN KEY (botiga_id)
        REFERENCES botiga(id)
        ON DELETE RESTRICT
);

CREATE TABLE item (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    foto_ref TEXT,
    subcategoria_id INTEGER NOT NULL,
    estat_preparacio VARCHAR,
    data_entrada_casa TIMESTAMPTZ,
    data_creacio TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_item_estat_preparacio
        CHECK (
            estat_preparacio IS NULL
            OR estat_preparacio IN ('no_preparada', 'preparada')
        ),

    CONSTRAINT fk_item_subcategoria
        FOREIGN KEY (subcategoria_id)
        REFERENCES subcategoria(id)
        ON DELETE RESTRICT
);

CREATE TABLE item_llista (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    item_id INTEGER NOT NULL UNIQUE,
    llista_id INTEGER NOT NULL,

    estat_comanda VARCHAR NOT NULL,

    preu_total NUMERIC(7,2) NOT NULL,
    quantitat_regalada NUMERIC(7,2) NOT NULL DEFAULT 0,
    quantitat_pagada NUMERIC(7,2) NOT NULL DEFAULT 0,

    data_recollida TIMESTAMPTZ,

    CONSTRAINT chk_item_llista_estat_comanda
        CHECK (
            estat_comanda IN (
                'demanat',
                'encarregat',
                'a_punt_per_recollir',
                'recollit'
            )
        ),

    CONSTRAINT chk_item_llista_preu_total
        CHECK (preu_total > 0),

    CONSTRAINT chk_item_llista_quantitat_regalada
        CHECK (quantitat_regalada >= 0),

    CONSTRAINT chk_item_llista_quantitat_pagada
        CHECK (quantitat_pagada >= 0),

    CONSTRAINT chk_item_llista_imports
        CHECK (
            quantitat_regalada + quantitat_pagada <= preu_total
        ),

    CONSTRAINT chk_item_llista_recollida
        CHECK (
            (estat_comanda = 'recollit' AND data_recollida IS NOT NULL)
            OR
            (estat_comanda <> 'recollit' AND data_recollida IS NULL)
        ),

    CONSTRAINT fk_item_llista_item
        FOREIGN KEY (item_id)
        REFERENCES item(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_item_llista_llista
        FOREIGN KEY (llista_id)
        REFERENCES llista_nado(id)
        ON DELETE RESTRICT
);