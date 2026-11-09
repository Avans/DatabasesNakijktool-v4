-- Practice database "outerspace", converted from the v2 MySQL dumps.

CREATE TABLE "bezoek" (
  "reisnr" DECIMAL(4,0) NOT NULL,
  "objectnaam" VARCHAR(10) COLLATE NOCASE NOT NULL,
  "volgnr" DECIMAL(2,0) NOT NULL,
  "verblijfsduur" DECIMAL(4,0) NOT NULL,
  PRIMARY KEY ("reisnr", "volgnr"),
  FOREIGN KEY ("objectnaam") REFERENCES "hemelobject" ("objectnaam") ON UPDATE CASCADE,
  FOREIGN KEY ("reisnr") REFERENCES "reis" ("reisnr") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "bezoek" VALUES (31, 'Maan', 1, 7);
INSERT INTO "bezoek" VALUES (32, 'Maan', 1, 0);
INSERT INTO "bezoek" VALUES (32, 'Phobos', 2, 1);
INSERT INTO "bezoek" VALUES (32, 'Deimos', 3, 0);
INSERT INTO "bezoek" VALUES (32, 'Mars', 4, 3);
INSERT INTO "bezoek" VALUES (32, 'Maan', 5, 2);
INSERT INTO "bezoek" VALUES (33, 'Maan', 1, 8);
INSERT INTO "bezoek" VALUES (34, 'Mars', 1, 14);
INSERT INTO "bezoek" VALUES (34, 'Jupiter', 2, 0);
INSERT INTO "bezoek" VALUES (34, 'Io', 3, 5);
INSERT INTO "bezoek" VALUES (35, 'Maan', 1, 5);
INSERT INTO "bezoek" VALUES (35, 'Mars', 2, 7);
INSERT INTO "bezoek" VALUES (35, 'Maan', 3, 0);
INSERT INTO "bezoek" VALUES (36, 'Mars', 1, 12);
INSERT INTO "bezoek" VALUES (36, 'Jupiter', 2, 0);
INSERT INTO "bezoek" VALUES (36, 'Io', 3, 3);
INSERT INTO "bezoek" VALUES (38, 'Mars', 1, 10);
INSERT INTO "bezoek" VALUES (38, 'Jupiter', 2, 12);
INSERT INTO "bezoek" VALUES (38, 'Venus', 3, 14);

CREATE TABLE "deelname" (
  "reisnr" DECIMAL(4,0) NOT NULL,
  "klantnr" INT NOT NULL,
  PRIMARY KEY ("reisnr", "klantnr"),
  FOREIGN KEY ("reisnr") REFERENCES "reis" ("reisnr") ON UPDATE CASCADE,
  FOREIGN KEY ("klantnr") REFERENCES "klant" ("klantnr") ON DELETE NO ACTION ON UPDATE NO ACTION
);

INSERT INTO "deelname" VALUES (31, 121);
INSERT INTO "deelname" VALUES (32, 121);
INSERT INTO "deelname" VALUES (33, 121);
INSERT INTO "deelname" VALUES (31, 122);
INSERT INTO "deelname" VALUES (34, 122);
INSERT INTO "deelname" VALUES (31, 123);
INSERT INTO "deelname" VALUES (32, 123);
INSERT INTO "deelname" VALUES (31, 124);
INSERT INTO "deelname" VALUES (32, 124);
INSERT INTO "deelname" VALUES (33, 125);
INSERT INTO "deelname" VALUES (34, 125);
INSERT INTO "deelname" VALUES (33, 126);
INSERT INTO "deelname" VALUES (34, 126);

CREATE TABLE "hemelobject" (
  "objectnaam" VARCHAR(10) COLLATE NOCASE NOT NULL,
  "satellietVan" VARCHAR(10) COLLATE NOCASE DEFAULT NULL,
  "afstand" DECIMAL(10,3) DEFAULT NULL,
  "diameter" DECIMAL(7,0) DEFAULT NULL,
  PRIMARY KEY ("objectnaam"),
  FOREIGN KEY ("satellietVan") REFERENCES "hemelobject" ("objectnaam")
);

INSERT INTO "hemelobject" VALUES ('Aarde', 'Zon', 149600.000, 12756);
INSERT INTO "hemelobject" VALUES ('Adrastea', 'Jupiter', 128.980, 21);
INSERT INTO "hemelobject" VALUES ('Amalthea', 'Jupiter', 181.300, 180);
INSERT INTO "hemelobject" VALUES ('Ananke', 'Jupiter', 21200.000, 20);
INSERT INTO "hemelobject" VALUES ('Ariel', 'Uranus', 191.000, 1158);
INSERT INTO "hemelobject" VALUES ('Atlas', 'Saturnus', 137.670, 33);
INSERT INTO "hemelobject" VALUES ('Belinda', 'Uranus', 75.258, 66);
INSERT INTO "hemelobject" VALUES ('Bianca', 'Uranus', 59.173, 42);
INSERT INTO "hemelobject" VALUES ('Calisto', 'Jupiter', 1880.000, 4806);
INSERT INTO "hemelobject" VALUES ('Calypso', 'Saturnus', 294.670, 24);
INSERT INTO "hemelobject" VALUES ('Carme', 'Jupiter', 22600.000, 30);
INSERT INTO "hemelobject" VALUES ('Charon', 'Pluto', 19.640, 1212);
INSERT INTO "hemelobject" VALUES ('Cordelia', 'Uranus', 49.471, 26);
INSERT INTO "hemelobject" VALUES ('Cressida', 'Uranus', 61.777, 62);
INSERT INTO "hemelobject" VALUES ('Deimos', 'Mars', 23.400, 7);
INSERT INTO "hemelobject" VALUES ('Desdemona', 'Uranus', 62.676, 54);
INSERT INTO "hemelobject" VALUES ('Despina', 'Neptunus', 52.500, 180);
INSERT INTO "hemelobject" VALUES ('Dione', 'Saturnus', 377.420, 1120);
INSERT INTO "hemelobject" VALUES ('Elara', 'Jupiter', 11737.000, 80);
INSERT INTO "hemelobject" VALUES ('Enceladus', 'Saturnus', 238.040, 498);
INSERT INTO "hemelobject" VALUES ('Epimetheus', 'Saturnus', 151.420, 180);
INSERT INTO "hemelobject" VALUES ('Europa', 'Jupiter', 670.900, 3130);
INSERT INTO "hemelobject" VALUES ('Galathea', 'Neptunus', 62.000, 150);
INSERT INTO "hemelobject" VALUES ('Ganymedes', 'Jupiter', 1070.000, 5268);
INSERT INTO "hemelobject" VALUES ('Helene', 'Saturnus', 377.410, 35);
INSERT INTO "hemelobject" VALUES ('Himalia', 'Jupiter', 11480.000, 170);
INSERT INTO "hemelobject" VALUES ('Hyperion', 'Saturnus', 1481.100, 295);
INSERT INTO "hemelobject" VALUES ('Iapetus', 'Saturnus', 3651.300, 1436);
INSERT INTO "hemelobject" VALUES ('Io', 'Jupiter', 421.600, 3645);
INSERT INTO "hemelobject" VALUES ('Janus', 'Saturnus', 151.470, 120);
INSERT INTO "hemelobject" VALUES ('Juliet', 'Uranus', 64.372, 84);
INSERT INTO "hemelobject" VALUES ('Jupiter', 'Zon', 778000.000, 143884);
INSERT INTO "hemelobject" VALUES ('Larissa', 'Neptunus', 73.600, 192);
INSERT INTO "hemelobject" VALUES ('Leda', 'Jupiter', 11094.000, 10);
INSERT INTO "hemelobject" VALUES ('Lysithea', 'Jupiter', 11720.000, 24);
INSERT INTO "hemelobject" VALUES ('Maan', 'Aarde', 384.400, 3476);
INSERT INTO "hemelobject" VALUES ('Mars', 'Zon', 227900.000, 6794);
INSERT INTO "hemelobject" VALUES ('Mercurius', 'Zon', 57900.000, 4878);
INSERT INTO "hemelobject" VALUES ('Metis', 'Jupiter', 127.960, 40);
INSERT INTO "hemelobject" VALUES ('Mimas', 'Saturnus', 185.540, 400);
INSERT INTO "hemelobject" VALUES ('Miranda', 'Uranus', 129.400, 472);
INSERT INTO "hemelobject" VALUES ('Naiad', 'Neptunus', 48.000, 54);
INSERT INTO "hemelobject" VALUES ('Neptunus', 'Zon', 4497000.000, 50538);
INSERT INTO "hemelobject" VALUES ('Nereïde', 'Neptunus', 5517.000, 240);
INSERT INTO "hemelobject" VALUES ('Oberon', 'Uranus', 583.500, 1523);
INSERT INTO "hemelobject" VALUES ('Ophelia', 'Uranus', 53.796, 30);
INSERT INTO "hemelobject" VALUES ('Pan', 'Saturnus', 133.600, 12);
INSERT INTO "hemelobject" VALUES ('Pandora', 'Saturnus', 141.700, 86);
INSERT INTO "hemelobject" VALUES ('Pasiphaë', 'Jupiter', 23500.000, 36);
INSERT INTO "hemelobject" VALUES ('Phobos', 'Mars', 9.270, 14);
INSERT INTO "hemelobject" VALUES ('Phoebe', 'Saturnus', 12954.000, 220);
INSERT INTO "hemelobject" VALUES ('Pluto', 'Zon', 5900000.000, 2324);
INSERT INTO "hemelobject" VALUES ('Portia', 'Uranus', 66.085, 108);
INSERT INTO "hemelobject" VALUES ('Prometheus', 'Saturnus', 139.350, 105);
INSERT INTO "hemelobject" VALUES ('Proteus', 'Neptunus', 117.600, 416);
INSERT INTO "hemelobject" VALUES ('Puck', 'Uranus', 86.000, 154);
INSERT INTO "hemelobject" VALUES ('Rhea', 'Saturnus', 527.040, 1528);
INSERT INTO "hemelobject" VALUES ('Rosalind', 'Uranus', 69.941, 54);
INSERT INTO "hemelobject" VALUES ('Saturnus', 'Zon', 1427000.000, 120536);
INSERT INTO "hemelobject" VALUES ('Sinope', 'Jupiter', 23700.000, 28);
INSERT INTO "hemelobject" VALUES ('Telesto', 'Saturnus', 294.670, 24);
INSERT INTO "hemelobject" VALUES ('Tethys', 'Saturnus', 294.670, 1046);
INSERT INTO "hemelobject" VALUES ('Thalassa', 'Neptunus', 50.000, 80);
INSERT INTO "hemelobject" VALUES ('Thebe', 'Jupiter', 221.900, 62);
INSERT INTO "hemelobject" VALUES ('Titan', 'Saturnus', 1221.860, 5150);
INSERT INTO "hemelobject" VALUES ('Titania', 'Uranus', 435.000, 1578);
INSERT INTO "hemelobject" VALUES ('Triton', 'Neptunus', 354.800, 2705);
INSERT INTO "hemelobject" VALUES ('Umbriel', 'Uranus', 266.300, 1169);
INSERT INTO "hemelobject" VALUES ('Uranus', 'Zon', 2870000.000, 51118);
INSERT INTO "hemelobject" VALUES ('Venus', 'Zon', 108200.000, 12104);
INSERT INTO "hemelobject" VALUES ('Zon', NULL, NULL, 1393000);

CREATE TABLE "klant" (
  "klantnr" INT NOT NULL,
  "naam" VARCHAR(100) COLLATE NOCASE DEFAULT NULL,
  "geboortedatum" DATETIME DEFAULT NULL,
  "straat" VARCHAR(45) COLLATE NOCASE DEFAULT NULL,
  "huisnummer" INT DEFAULT NULL,
  "postcode" VARCHAR(6) COLLATE NOCASE DEFAULT NULL,
  PRIMARY KEY ("klantnr"),
  UNIQUE ("naam")
);

INSERT INTO "klant" VALUES (121, 'Arne', '1978-10-10 00:00:00', NULL, NULL, NULL);
INSERT INTO "klant" VALUES (122, 'Céline', '1982-05-12 00:00:00', NULL, NULL, NULL);
INSERT INTO "klant" VALUES (123, 'Leonard', '1934-01-01 00:00:00', NULL, NULL, NULL);
INSERT INTO "klant" VALUES (124, 'Felix', '1954-06-26 00:00:00', NULL, NULL, NULL);
INSERT INTO "klant" VALUES (125, 'Rian', '1978-11-11 00:00:00', NULL, NULL, NULL);
INSERT INTO "klant" VALUES (126, 'Jack', '2001-12-12 00:00:00', NULL, NULL, NULL);

CREATE TABLE "reis" (
  "reisnr" DECIMAL(4,0) NOT NULL,
  "vertrekdatum" DATETIME NOT NULL,
  "reisduur" DECIMAL(4,0) NOT NULL,
  "prijs" DECIMAL(10,2) DEFAULT NULL,
  PRIMARY KEY ("reisnr")
);

INSERT INTO "reis" VALUES (31, '2005-01-01 00:00:00', 10, 2.50);
INSERT INTO "reis" VALUES (32, '2004-10-10 00:00:00', 390, 17.50);
INSERT INTO "reis" VALUES (33, '1998-12-12 00:00:00', 11, 2.65);
INSERT INTO "reis" VALUES (34, '1985-01-12 00:00:00', 1380, 75.00);
INSERT INTO "reis" VALUES (35, '1984-05-12 00:00:00', 380, 16.50);
INSERT INTO "reis" VALUES (36, '2010-09-16 00:00:00', 1340, NULL);
INSERT INTO "reis" VALUES (37, '2009-12-12 00:00:00', 345, 678.00);
INSERT INTO "reis" VALUES (38, '0000-00-00 00:00:00', 300, 20000000.00);

CREATE TABLE "telefoon" (
  "telefoonnr" INT NOT NULL,
  "klantnr" INT DEFAULT NULL,
  PRIMARY KEY ("telefoonnr"),
  FOREIGN KEY ("klantnr") REFERENCES "klant" ("klantnr") ON DELETE NO ACTION ON UPDATE NO ACTION
);

INSERT INTO "telefoon" VALUES (362939233, NULL);
INSERT INTO "telefoon" VALUES (736277189, NULL);
INSERT INTO "telefoon" VALUES (1234561098, 121);
INSERT INTO "telefoon" VALUES (1234567890, 121);
