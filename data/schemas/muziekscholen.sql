-- Practice database "muziekscholen", converted from the v2 MySQL dumps.

CREATE TABLE "muziekschool" (
  "schoolId" DECIMAL(2,0) NOT NULL,
  "naam" VARCHAR(30) COLLATE NOCASE NOT NULL,
  "plaatsnaam" VARCHAR(20) COLLATE NOCASE NOT NULL,
  PRIMARY KEY ("schoolId"),
  UNIQUE ("naam")
);

INSERT INTO "muziekschool" VALUES (1, 'Muziekschool Slabroek', 'Uden');
INSERT INTO "muziekschool" VALUES (2, 'Avans Muziekschool', 'Den Bosch');
INSERT INTO "muziekschool" VALUES (3, 'Het Muziekpakhuis', 'Amsterdam');

CREATE TABLE "componist" (
  "componistId" DECIMAL(4,0) NOT NULL,
  "naam" VARCHAR(20) COLLATE NOCASE NOT NULL,
  "geboortedatum" DATETIME DEFAULT NULL,
  "schoolId" DECIMAL(2,0) DEFAULT NULL,
  PRIMARY KEY ("componistId"),
  UNIQUE ("naam"),
  FOREIGN KEY ("schoolId") REFERENCES "muziekschool" ("schoolId") ON UPDATE CASCADE
);

INSERT INTO "componist" VALUES (1, 'Charlie Parker', '1904-12-12 00:00:00', NULL);
INSERT INTO "componist" VALUES (2, 'Thom Guidi', '1946-01-05 00:00:00', 1);
INSERT INTO "componist" VALUES (4, 'Rudolf Escher', '1912-01-08 00:00:00', NULL);
INSERT INTO "componist" VALUES (5, 'Sofie Bergeijk', '1960-07-12 00:00:00', 2);
INSERT INTO "componist" VALUES (8, 'W.A. Mozart', '1756-01-27 00:00:00', NULL);
INSERT INTO "componist" VALUES (9, 'Karl Schumann', '1935-10-10 00:00:00', 2);
INSERT INTO "componist" VALUES (10, 'Jan van Maanen', '1965-09-08 00:00:00', 1);
INSERT INTO "componist" VALUES (11, 'Marvin Adams', '2000-01-01 00:00:00', NULL);

CREATE TABLE "genre" (
  "genrenaam" VARCHAR(10) COLLATE NOCASE NOT NULL,
  PRIMARY KEY ("genrenaam")
);

INSERT INTO "genre" VALUES ('jazz');
INSERT INTO "genre" VALUES ('klassiek');
INSERT INTO "genre" VALUES ('pop');
INSERT INTO "genre" VALUES ('spacemusic');
INSERT INTO "genre" VALUES ('techno');

CREATE TABLE "instrument" (
  "instrumentnaam" VARCHAR(14) COLLATE NOCASE NOT NULL,
  "toonhoogte" VARCHAR(7) COLLATE NOCASE NOT NULL,
  PRIMARY KEY ("instrumentnaam", "toonhoogte")
);

INSERT INTO "instrument" VALUES ('drums', '');
INSERT INTO "instrument" VALUES ('fluit', '');
INSERT INTO "instrument" VALUES ('fluit', 'alt');
INSERT INTO "instrument" VALUES ('gitaar', '');
INSERT INTO "instrument" VALUES ('piano', '');
INSERT INTO "instrument" VALUES ('saxofoon', 'alt');
INSERT INTO "instrument" VALUES ('saxofoon', 'sopraan');
INSERT INTO "instrument" VALUES ('saxofoon', 'tenor');
INSERT INTO "instrument" VALUES ('viool', '');
INSERT INTO "instrument" VALUES ('viool', 'alt');

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
  "stuknr" DECIMAL(5,0) NOT NULL,
  "componistId" DECIMAL(4,0) NOT NULL,
  "titel" VARCHAR(20) COLLATE NOCASE NOT NULL,
  "stuknrOrigineel" DECIMAL(5,0) DEFAULT NULL,
  "genrenaam" VARCHAR(10) COLLATE NOCASE NOT NULL,
  "niveaucode" CHAR(1) COLLATE NOCASE DEFAULT NULL,
  "speelduur" DECIMAL(3,1) DEFAULT NULL,
  "jaartal" DECIMAL(4,0) NOT NULL,
  PRIMARY KEY ("stuknr"),
  UNIQUE ("componistId", "titel"),
  FOREIGN KEY ("componistId") REFERENCES "componist" ("componistId") ON UPDATE CASCADE,
  FOREIGN KEY ("genrenaam") REFERENCES "genre" ("genrenaam") ON UPDATE CASCADE,
  FOREIGN KEY ("niveaucode") REFERENCES "niveau" ("niveaucode") ON UPDATE CASCADE,
  FOREIGN KEY ("stuknrOrigineel") REFERENCES "stuk" ("stuknr")
);

INSERT INTO "stuk" VALUES (1, 1, 'Blue bird', NULL, 'jazz', NULL, 4.5, 1954);
INSERT INTO "stuk" VALUES (2, 2, 'Blue bird', 1, 'jazz', 'B', 4.0, 1988);
INSERT INTO "stuk" VALUES (3, 4, 'Air pur charmer', NULL, 'klassiek', 'B', 4.5, 1953);
INSERT INTO "stuk" VALUES (5, 5, 'Lina', NULL, 'klassiek', 'B', 5.0, 1979);
INSERT INTO "stuk" VALUES (8, 8, 'Berceuse', NULL, 'klassiek', 'C', 4.0, 1786);
INSERT INTO "stuk" VALUES (9, 2, 'Cradle song', 8, 'klassiek', 'B', 3.5, 1990);
INSERT INTO "stuk" VALUES (10, 8, 'Non piu andrai', NULL, 'klassiek', NULL, NULL, 1791);
INSERT INTO "stuk" VALUES (12, 9, 'I''ll never go', 10, 'pop', 'A', 6.0, 1996);
INSERT INTO "stuk" VALUES (13, 10, 'Swinging Lina', 5, 'jazz', 'B', 8.0, 1997);
INSERT INTO "stuk" VALUES (14, 5, 'Little Lina', 5, 'klassiek', 'A', 4.3, 1998);
INSERT INTO "stuk" VALUES (15, 10, 'Blue sky', 1, 'jazz', 'A', 4.0, 1998);
INSERT INTO "stuk" VALUES (16, 11, 'Marvin''s song', NULL, 'spacemusic', NULL, NULL, 0);

CREATE TABLE "stukinstrument" (
  "stuknr" DECIMAL(5,0) NOT NULL,
  "instrumentnaam" VARCHAR(14) COLLATE NOCASE NOT NULL,
  "toonhoogte" VARCHAR(7) COLLATE NOCASE NOT NULL,
  "aantal" DECIMAL(2,0) NOT NULL,
  PRIMARY KEY ("stuknr", "instrumentnaam", "toonhoogte"),
  FOREIGN KEY ("stuknr") REFERENCES "stuk" ("stuknr") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("instrumentnaam", "toonhoogte") REFERENCES "instrument" ("instrumentnaam", "toonhoogte") ON UPDATE CASCADE
);

INSERT INTO "stukinstrument" VALUES (2, 'drums', '', 1);
INSERT INTO "stukinstrument" VALUES (2, 'piano', '', 1);
INSERT INTO "stukinstrument" VALUES (2, 'saxofoon', 'alt', 2);
INSERT INTO "stukinstrument" VALUES (2, 'saxofoon', 'tenor', 1);
INSERT INTO "stukinstrument" VALUES (3, 'fluit', '', 1);
INSERT INTO "stukinstrument" VALUES (5, 'fluit', '', 3);
INSERT INTO "stukinstrument" VALUES (9, 'fluit', '', 1);
INSERT INTO "stukinstrument" VALUES (9, 'fluit', 'alt', 1);
INSERT INTO "stukinstrument" VALUES (9, 'piano', '', 1);
INSERT INTO "stukinstrument" VALUES (12, 'fluit', '', 2);
INSERT INTO "stukinstrument" VALUES (12, 'piano', '', 1);
INSERT INTO "stukinstrument" VALUES (13, 'drums', '', 1);
INSERT INTO "stukinstrument" VALUES (13, 'fluit', '', 2);
INSERT INTO "stukinstrument" VALUES (13, 'saxofoon', 'alt', 1);
INSERT INTO "stukinstrument" VALUES (13, 'saxofoon', 'tenor', 1);
INSERT INTO "stukinstrument" VALUES (14, 'fluit', '', 1);
INSERT INTO "stukinstrument" VALUES (14, 'piano', '', 1);
INSERT INTO "stukinstrument" VALUES (15, 'fluit', 'alt', 2);
INSERT INTO "stukinstrument" VALUES (15, 'piano', '', 1);
INSERT INTO "stukinstrument" VALUES (15, 'saxofoon', 'alt', 2);
