----- Development only -----
INSERT INTO images VALUES ('846aca55-929a-4a6b-aede-732617dd5477',
                           'Dummy Image',
                           60*6);
INSERT INTO rules VALUES ('5cec2b7a-7034-4c54-9fd3-67e8b5f542d0',
                          '846aca55-929a-4a6b-aede-732617dd5477',
                          'Test case passed',
                          100,
                          'true',
                          0);
INSERT INTO sessions VALUES ('19b20ec9-f9a4-41f5-b007-7a887c3ddcce',
                             '846aca55-929a-4a6b-aede-732617dd5477',
                             'Zhenkai Weng',
                             CURRENT_TIMESTAMP,
                             '{"pts":0,"vulns":[],"penalties":[]}',
                             0,
                             NULL,
                             0);
