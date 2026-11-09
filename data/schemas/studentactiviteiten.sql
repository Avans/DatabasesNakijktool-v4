-- Practice database "studentactiviteiten", converted from the v2 MySQL dumps.

CREATE TABLE "activiteit" (
  "actcode" VARCHAR(5) COLLATE NOCASE NOT NULL,
  "actomschr" VARCHAR(20) COLLATE NOCASE DEFAULT NULL,
  "prijs" DECIMAL(9,2) DEFAULT NULL,
  PRIMARY KEY ("actcode")
);

INSERT INTO "activiteit" VALUES ('BEU', 'Beugelen', 12.00);
INSERT INTO "activiteit" VALUES ('GAB', 'Gaaibollen', 7.00);
INSERT INTO "activiteit" VALUES ('HAG', 'Hangglijden', 100.00);
INSERT INTO "activiteit" VALUES ('KLS', 'Klootschieten', 10.00);
INSERT INTO "activiteit" VALUES ('KRS', 'Kratstapelen', 15.00);
INSERT INTO "activiteit" VALUES ('OPS', 'Opschieten', 2.00);
INSERT INTO "activiteit" VALUES ('PBA', 'Paintballen', 25.00);
INSERT INTO "activiteit" VALUES ('PIE', 'Pieren', 8.00);
INSERT INTO "activiteit" VALUES ('PLZ', 'Paalzitten', 5.00);
INSERT INTO "activiteit" VALUES ('SNB', 'Snowboarden', 30.00);

CREATE TABLE "belangstelling" (
  "studentnr" INT NOT NULL,
  "actcode" VARCHAR(5) COLLATE NOCASE NOT NULL,
  "datum" DATE DEFAULT NULL,
  PRIMARY KEY ("studentnr", "actcode"),
  FOREIGN KEY ("actcode") REFERENCES "activiteit" ("actcode"),
  FOREIGN KEY ("studentnr") REFERENCES "student" ("studentnr")
);

INSERT INTO "belangstelling" VALUES (1, 'PIE', '2011-06-26');
INSERT INTO "belangstelling" VALUES (2, 'KRS', NULL);
INSERT INTO "belangstelling" VALUES (3, 'BEU', NULL);
INSERT INTO "belangstelling" VALUES (4, 'HAG', NULL);
INSERT INTO "belangstelling" VALUES (4, 'PLZ', NULL);
INSERT INTO "belangstelling" VALUES (4, 'SNB', NULL);
INSERT INTO "belangstelling" VALUES (5, 'KRS', NULL);
INSERT INTO "belangstelling" VALUES (6, 'KRS', NULL);
INSERT INTO "belangstelling" VALUES (7, 'HAG', NULL);
INSERT INTO "belangstelling" VALUES (8, 'HAG', NULL);
INSERT INTO "belangstelling" VALUES (8, 'PBA', NULL);
INSERT INTO "belangstelling" VALUES (9, 'SNB', NULL);
INSERT INTO "belangstelling" VALUES (10, 'GAB', NULL);
INSERT INTO "belangstelling" VALUES (11, 'PIE', '2011-08-12');
INSERT INTO "belangstelling" VALUES (12, 'PIE', '2011-09-13');
INSERT INTO "belangstelling" VALUES (13, 'PIE', '2011-07-12');
INSERT INTO "belangstelling" VALUES (14, 'PIE', '2011-07-12');

CREATE TABLE "beschikbaar" (
  "datum" DATE NOT NULL,
  PRIMARY KEY ("datum")
);

INSERT INTO "beschikbaar" VALUES ('2011-09-29');
INSERT INTO "beschikbaar" VALUES ('2011-10-01');
INSERT INTO "beschikbaar" VALUES ('2011-10-12');
INSERT INTO "beschikbaar" VALUES ('2011-10-13');
INSERT INTO "beschikbaar" VALUES ('2011-10-14');
INSERT INTO "beschikbaar" VALUES ('2011-11-11');
INSERT INTO "beschikbaar" VALUES ('2011-12-25');
INSERT INTO "beschikbaar" VALUES ('2012-05-20');
INSERT INTO "beschikbaar" VALUES ('2012-05-21');
INSERT INTO "beschikbaar" VALUES ('2012-05-22');
INSERT INTO "beschikbaar" VALUES ('2012-06-26');
INSERT INTO "beschikbaar" VALUES ('2012-06-27');
INSERT INTO "beschikbaar" VALUES ('2012-06-28');

CREATE TABLE "inschrijving" (
  "inschrijvingsnr" INT NOT NULL,
  "betaald" TINYINT(1) DEFAULT '0',
  "studentnr" INT NOT NULL,
  "planningsnr" INT NOT NULL,
  "datum" DATETIME DEFAULT NULL,
  PRIMARY KEY ("inschrijvingsnr"),
  FOREIGN KEY ("planningsnr") REFERENCES "planning" ("planningsnr"),
  FOREIGN KEY ("studentnr") REFERENCES "student" ("studentnr") ON DELETE CASCADE
);

INSERT INTO "inschrijving" VALUES (1, 1, 1, 1, NULL);
INSERT INTO "inschrijving" VALUES (2, 0, 2, 3, NULL);
INSERT INTO "inschrijving" VALUES (3, 0, 1, 3, NULL);
INSERT INTO "inschrijving" VALUES (4, 0, 1, 2, NULL);
INSERT INTO "inschrijving" VALUES (5, 1, 1, 6, NULL);
INSERT INTO "inschrijving" VALUES (6, 1, 2, 6, NULL);
INSERT INTO "inschrijving" VALUES (7, 0, 2, 7, NULL);
INSERT INTO "inschrijving" VALUES (8, 0, 1, 7, NULL);
INSERT INTO "inschrijving" VALUES (9, 0, 3, 1, NULL);
INSERT INTO "inschrijving" VALUES (10, 0, 4, 2, NULL);
INSERT INTO "inschrijving" VALUES (11, 0, 2, 7, NULL);
INSERT INTO "inschrijving" VALUES (12, 0, 17, 11, '2011-09-27 00:00:00');
INSERT INTO "inschrijving" VALUES (13, 1, 1, 12, NULL);
INSERT INTO "inschrijving" VALUES (14, 0, 2, 12, NULL);
INSERT INTO "inschrijving" VALUES (18, 1, 3, 12, NULL);

CREATE TABLE "opleiding" (
  "oplcode" VARCHAR(5) COLLATE NOCASE NOT NULL,
  "omschrijving" VARCHAR(40) COLLATE NOCASE DEFAULT NULL,
  "academie" VARCHAR(40) COLLATE NOCASE DEFAULT NULL,
  PRIMARY KEY ("oplcode")
);

INSERT INTO "opleiding" VALUES ('BK', 'Bouwkunde', 'ABCT');
INSERT INTO "opleiding" VALUES ('CT', 'Civiele Techniek', 'ABCT');
INSERT INTO "opleiding" VALUES ('ET', 'Electrotechniek', 'AII');
INSERT INTO "opleiding" VALUES ('IN', 'Informatica', 'AII');
INSERT INTO "opleiding" VALUES ('TBK', 'Technische Bedrijfskunde', 'AII');
INSERT INTO "opleiding" VALUES ('TI', 'Technische Informatica', 'AII');
INSERT INTO "opleiding" VALUES ('VS', 'Virtueel Studeren', NULL);
INSERT INTO "opleiding" VALUES ('WTB', 'Werktuigbouw', 'AII');

CREATE TABLE "planning" (
  "planningsnr" INT NOT NULL,
  "actcode" VARCHAR(5) COLLATE NOCASE NOT NULL,
  "datum" DATE NOT NULL,
  PRIMARY KEY ("planningsnr"),
  FOREIGN KEY ("actcode") REFERENCES "activiteit" ("actcode") ON DELETE CASCADE,
  FOREIGN KEY ("datum") REFERENCES "beschikbaar" ("datum")
);

INSERT INTO "planning" VALUES (1, 'KLS', '2011-10-12');
INSERT INTO "planning" VALUES (2, 'BEU', '2011-10-13');
INSERT INTO "planning" VALUES (3, 'GAB', '2011-10-14');
INSERT INTO "planning" VALUES (4, 'KLS', '2012-06-26');
INSERT INTO "planning" VALUES (5, 'BEU', '2012-06-27');
INSERT INTO "planning" VALUES (6, 'PLZ', '2012-05-20');
INSERT INTO "planning" VALUES (7, 'KRS', '2012-05-20');
INSERT INTO "planning" VALUES (8, 'HAG', '2012-05-21');
INSERT INTO "planning" VALUES (9, 'SNB', '2012-05-22');
INSERT INTO "planning" VALUES (10, 'HAG', '2012-06-27');
INSERT INTO "planning" VALUES (11, 'PIE', '2011-11-11');
INSERT INTO "planning" VALUES (12, 'KLS', '2011-10-01');
INSERT INTO "planning" VALUES (13, 'KLS', '2011-09-29');

CREATE TABLE "student" (
  "studentnr" INT NOT NULL,
  "naam" VARCHAR(35) COLLATE NOCASE DEFAULT NULL,
  "oplcode" VARCHAR(5) COLLATE NOCASE DEFAULT NULL,
  PRIMARY KEY ("studentnr"),
  FOREIGN KEY ("oplcode") REFERENCES "opleiding" ("oplcode")
);

INSERT INTO "student" VALUES (1, 'Koos Tomeloos', 'IN');
INSERT INTO "student" VALUES (2, 'Miep Kiep', 'IN');
INSERT INTO "student" VALUES (3, 'Has Verras', 'TI');
INSERT INTO "student" VALUES (4, 'Klaas Vaak', 'TI');
INSERT INTO "student" VALUES (5, 'Moos Tomeloos', 'ET');
INSERT INTO "student" VALUES (6, 'Toos Tomeloos', 'IN');
INSERT INTO "student" VALUES (7, 'Roos Tomeloos', 'IN');
INSERT INTO "student" VALUES (8, 'Ties van Nies', 'TI');
INSERT INTO "student" VALUES (9, 'Tini Lamborghini', 'ET');
INSERT INTO "student" VALUES (10, 'Hans Pommerans', 'IN');
INSERT INTO "student" VALUES (11, 'Dorus van der Heijden', 'TI');
INSERT INTO "student" VALUES (12, 'Bas Bahco', 'WTB');
INSERT INTO "student" VALUES (13, 'Kees van Hees', 'WTB');
INSERT INTO "student" VALUES (14, 'Lies van den Dries', 'TBK');
INSERT INTO "student" VALUES (15, 'Joop de Hoop', 'TBK');
INSERT INTO "student" VALUES (16, 'Teun Timmer', 'BK');
INSERT INTO "student" VALUES (17, 'Willem Water', 'CT');
INSERT INTO "student" VALUES (18, 'Bas Tameloos', 'CT');
