-- Practice database "muziekstukken", converted from the v2 MySQL dumps.

CREATE TABLE "muziekschool" (
  "schoolnaam" VARCHAR(100) COLLATE NOCASE NOT NULL,
  "plaatsnaam" VARCHAR(100) COLLATE NOCASE NOT NULL,
  "land" VARCHAR(100) COLLATE NOCASE NOT NULL,
  "oprichtingsjaar" INT NOT NULL,
  "omschrijving" VARCHAR(1000) COLLATE NOCASE DEFAULT NULL,
  PRIMARY KEY ("schoolnaam", "plaatsnaam", "land"),
  UNIQUE ("schoolnaam")
);

INSERT INTO "muziekschool" VALUES ('Classic Rock Academy', 'Londen', 'Engeland', 1975, 'Step on the stairway to heaven');
INSERT INTO "muziekschool" VALUES ('Classical Creation', 'Tilburg', 'Nederland', 1997, 'De klasieke opleiding met een twist');
INSERT INTO "muziekschool" VALUES ('Jazzify', 'Amsterdam', 'Nederland', 1998, 'De beste in jazz');
INSERT INTO "muziekschool" VALUES ('Klassieke Pracht', 'Antwerpen', 'België', 1959, 'Niks mooier dan Bach en Beethoven');
INSERT INTO "muziekschool" VALUES ('Music Moves Us all', 'Eindhoven', 'Nederland', 2000, 'Passie voor muziek');
INSERT INTO "muziekschool" VALUES ('Rock On', 'Dover', 'Engeland', 1985, 'We will rock you');

CREATE TABLE "componist" (
  "componistId" INT NOT NULL,
  "naam" VARCHAR(20) COLLATE NOCASE NOT NULL,
  "geboortedatum" DATETIME DEFAULT NULL,
  "muziekschoolnaam" VARCHAR(100) COLLATE NOCASE NOT NULL,
  "muziekschoolplaats" VARCHAR(100) COLLATE NOCASE NOT NULL,
  "muziekschoolland" VARCHAR(100) COLLATE NOCASE NOT NULL,
  PRIMARY KEY ("componistId"),
  UNIQUE ("naam"),
  FOREIGN KEY ("muziekschoolnaam", "muziekschoolplaats", "muziekschoolland") REFERENCES "muziekschool" ("schoolnaam", "plaatsnaam", "land") ON DELETE NO ACTION ON UPDATE NO ACTION
);

INSERT INTO "componist" VALUES (1, 'Astrando Palm', '1965-11-30 00:00:00', 'Classic Rock Academy', 'Londen', 'Engeland');
INSERT INTO "componist" VALUES (2, 'Ayah Schoute', '1992-07-03 00:00:00', 'Music Moves Us All', 'Eindhoven', 'Nederland');
INSERT INTO "componist" VALUES (3, 'Sanne de Wild', '1950-08-03 00:00:00', 'Klassieke Pracht', 'Antwerpen', 'België');
INSERT INTO "componist" VALUES (4, 'Ernest Broekhoff', '1992-11-19 00:00:00', 'Klassieke Pracht', 'Antwerpen', 'België');
INSERT INTO "componist" VALUES (5, 'Cristina Markus', '1991-03-28 00:00:00', 'Jazzify', 'Amsterdam', 'Nederland');
INSERT INTO "componist" VALUES (6, 'Feride Roth', '1973-10-12 00:00:00', 'rock On', 'Dover', 'Engeland');
INSERT INTO "componist" VALUES (7, 'Jadey de Gelder', '1985-02-13 00:00:00', 'Jazzify', 'Amsterdam', 'Nederland');
INSERT INTO "componist" VALUES (8, 'Zilan Havinga', '1976-12-29 00:00:00', 'Klassieke Pracht', 'Antwerpen', 'België');
INSERT INTO "componist" VALUES (9, 'Sheldon van de Mheen', '1983-11-23 00:00:00', 'Jazzify', 'Amsterdam', 'Nederland');
INSERT INTO "componist" VALUES (10, 'Yentle Oz', '1976-12-29 00:00:00', 'Classic Rock Academy', 'Londen', 'Engeland');
INSERT INTO "componist" VALUES (11, 'Roelfina Saarloos', '1999-05-19 00:00:00', 'Jazzify', 'Amsterdam', 'Nederland');
INSERT INTO "componist" VALUES (12, 'Jos Hogendorp', '1990-12-22 00:00:00', 'Classical Creation', 'Tilburg', 'Nederland');
INSERT INTO "componist" VALUES (13, 'Boy Roseboom', '1977-07-15 00:00:00', 'Jazzify', 'Amsterdam', 'Nederland');
INSERT INTO "componist" VALUES (14, 'Conner van Jaarsveld', '1988-01-24 00:00:00', 'Rock On', 'Dover', 'Engeland');
INSERT INTO "componist" VALUES (15, 'Keenan Meerveld', '1976-06-18 00:00:00', 'Classic Rock Academy', 'Londen', 'Engeland');
INSERT INTO "componist" VALUES (16, 'Raff Wijmenga', '1995-10-20 00:00:00', 'Classical Creation', 'Tilburg', 'Nederland');
INSERT INTO "componist" VALUES (17, 'Yana Kooren', '1988-05-19 00:00:00', 'Classical Creation', 'Tilburg', 'Nederland');

CREATE TABLE "genre" (
  "genrenaam" VARCHAR(12) COLLATE NOCASE NOT NULL,
  PRIMARY KEY ("genrenaam")
);

INSERT INTO "genre" VALUES ('classic rock');
INSERT INTO "genre" VALUES ('jazz');
INSERT INTO "genre" VALUES ('klassiek');
INSERT INTO "genre" VALUES ('pop');
INSERT INTO "genre" VALUES ('rock');

CREATE TABLE "instrument" (
  "instrumentId" INT NOT NULL,
  "instrumentnaam" VARCHAR(14) COLLATE NOCASE NOT NULL,
  "toonhoogte" VARCHAR(7) COLLATE NOCASE DEFAULT NULL,
  PRIMARY KEY ("instrumentId")
);

INSERT INTO "instrument" VALUES (1, 'drums', NULL);
INSERT INTO "instrument" VALUES (2, 'fluit', NULL);
INSERT INTO "instrument" VALUES (3, 'fluit', 'alt');
INSERT INTO "instrument" VALUES (4, 'gitaar', NULL);
INSERT INTO "instrument" VALUES (5, 'piano', NULL);
INSERT INTO "instrument" VALUES (6, 'saxofoon', 'alt');
INSERT INTO "instrument" VALUES (8, 'saxofoon', 'tenor');
INSERT INTO "instrument" VALUES (9, 'viool', NULL);
INSERT INTO "instrument" VALUES (10, 'viool', 'alt');

CREATE TABLE "niveau" (
  "niveaucode" CHAR(1) COLLATE NOCASE NOT NULL,
  "omschrijving" VARCHAR(15) COLLATE NOCASE NOT NULL,
  PRIMARY KEY ("niveaucode"),
  UNIQUE ("omschrijving")
);

INSERT INTO "niveau" VALUES ('A', 'beginners');
INSERT INTO "niveau" VALUES ('D', 'genie');
INSERT INTO "niveau" VALUES ('B', 'gevorderden');
INSERT INTO "niveau" VALUES ('C', 'vergevorderden');

CREATE TABLE "stuk" (
  "stuknr" INT NOT NULL,
  "componistId" INT NOT NULL,
  "titel" VARCHAR(20) COLLATE NOCASE NOT NULL,
  "origineel_stuknr" INT DEFAULT NULL,
  "origineel_componistId" INT DEFAULT NULL,
  "genrenaam" VARCHAR(12) COLLATE NOCASE NOT NULL,
  "niveaucode" CHAR(1) COLLATE NOCASE DEFAULT NULL,
  "speelduur" DECIMAL(3,1) DEFAULT NULL,
  "jaartal" INT NOT NULL,
  PRIMARY KEY ("stuknr", "componistId"),
  UNIQUE ("componistId", "titel"),
  FOREIGN KEY ("origineel_stuknr", "origineel_componistId") REFERENCES "stuk" ("stuknr", "componistId") ON DELETE NO ACTION ON UPDATE NO ACTION,
  FOREIGN KEY ("componistId") REFERENCES "componist" ("componistId") ON UPDATE CASCADE,
  FOREIGN KEY ("genrenaam") REFERENCES "genre" ("genrenaam") ON UPDATE CASCADE,
  FOREIGN KEY ("niveaucode") REFERENCES "niveau" ("niveaucode") ON UPDATE CASCADE
);

INSERT INTO "stuk" VALUES (1, 1, 'In Yesterday', NULL, NULL, 'classic rock', 'C', 4.0, 1990);
INSERT INTO "stuk" VALUES (1, 7, 'Sweet Travels', 1, 13, 'jazz', 'A', 3.0, 2004);
INSERT INTO "stuk" VALUES (1, 10, 'Guitar Jam', 3, 3, 'classic rock', 'B', 4.2, 1990);
INSERT INTO "stuk" VALUES (1, 13, 'Travel Miracles', NULL, NULL, 'jazz', 'B', NULL, 1997);
INSERT INTO "stuk" VALUES (1, 15, 'Sounds Of Power', 4, 1, 'rock', 'C', 4.0, 2001);
INSERT INTO "stuk" VALUES (1, 17, 'Sounds Of Water', 4, 1, 'klassiek', 'D', 5.0, 2018);
INSERT INTO "stuk" VALUES (2, 7, 'Rhythm Of Afternoon', NULL, NULL, 'jazz', NULL, 3.3, 2004);
INSERT INTO "stuk" VALUES (2, 13, 'Modern Miracles', 1, 13, 'jazz', NULL, NULL, 2000);
INSERT INTO "stuk" VALUES (2, 15, 'Ice Energy', NULL, NULL, 'classic rock', 'B', 2.9, 2005);
INSERT INTO "stuk" VALUES (2, 17, 'Cave Of Love', 3, 1, 'klassiek', 'C', 4.6, 2019);
INSERT INTO "stuk" VALUES (3, 1, 'Cave Of Scars', NULL, NULL, 'rock', NULL, 3.7, 1992);
INSERT INTO "stuk" VALUES (3, 3, 'Piano Wave', NULL, NULL, 'klassiek', 'A', NULL, 1975);
INSERT INTO "stuk" VALUES (3, 7, 'Welcome Rainy Day', NULL, NULL, 'jazz', 'B', 3.8, 2005);
INSERT INTO "stuk" VALUES (4, 1, 'Sounds Of Vibrations', NULL, NULL, 'classic rock', 'D', 3.5, 1993);
INSERT INTO "stuk" VALUES (5, 7, 'Rhythm Of Fire', 2, 7, 'jazz', 'C', 3.6, 2008);

CREATE TABLE "stukinstrument" (
  "stuknr" INT NOT NULL,
  "componistId" INT NOT NULL,
  "instrumentId" INT NOT NULL,
  "aantal" INT NOT NULL,
  PRIMARY KEY ("stuknr", "componistId", "instrumentId"),
  FOREIGN KEY ("instrumentId") REFERENCES "instrument" ("instrumentId") ON DELETE NO ACTION ON UPDATE NO ACTION,
  FOREIGN KEY ("stuknr", "componistId") REFERENCES "stuk" ("stuknr", "componistId") ON DELETE NO ACTION ON UPDATE NO ACTION
);

INSERT INTO "stukinstrument" VALUES (1, 1, 1, 1);
INSERT INTO "stukinstrument" VALUES (1, 1, 4, 2);
INSERT INTO "stukinstrument" VALUES (1, 1, 5, 1);
INSERT INTO "stukinstrument" VALUES (1, 10, 1, 1);
INSERT INTO "stukinstrument" VALUES (1, 10, 4, 4);
INSERT INTO "stukinstrument" VALUES (1, 15, 1, 1);
INSERT INTO "stukinstrument" VALUES (1, 15, 4, 3);
INSERT INTO "stukinstrument" VALUES (1, 15, 5, 1);
INSERT INTO "stukinstrument" VALUES (1, 17, 3, 1);
INSERT INTO "stukinstrument" VALUES (1, 17, 5, 1);
INSERT INTO "stukinstrument" VALUES (1, 17, 10, 1);
INSERT INTO "stukinstrument" VALUES (2, 7, 5, 1);
INSERT INTO "stukinstrument" VALUES (2, 7, 6, 1);
INSERT INTO "stukinstrument" VALUES (2, 7, 8, 1);
INSERT INTO "stukinstrument" VALUES (2, 17, 9, 3);
INSERT INTO "stukinstrument" VALUES (3, 1, 4, 3);
INSERT INTO "stukinstrument" VALUES (3, 3, 2, 1);
INSERT INTO "stukinstrument" VALUES (3, 3, 6, 1);
INSERT INTO "stukinstrument" VALUES (3, 3, 8, 1);
INSERT INTO "stukinstrument" VALUES (3, 3, 10, 1);
INSERT INTO "stukinstrument" VALUES (4, 1, 4, 2);
INSERT INTO "stukinstrument" VALUES (4, 1, 5, 2);
INSERT INTO "stukinstrument" VALUES (5, 7, 5, 1);
INSERT INTO "stukinstrument" VALUES (5, 7, 6, 1);
