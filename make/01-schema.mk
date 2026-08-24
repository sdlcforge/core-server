SCHEMA_SRC:=$(SRC)/controls/schema
SCHEMA_FILES:=$(SCHEMA_SRC)/audit.schema.json
SCHEMA_DIST:=$(patsubst $(SCHEMA_SRC)%, $(DIST)%, $(SCHEMA_FILES))

$(SCHEMA_DIST): $(DIST)% : $(SCHEMA_SRC)%
	cp $< $@

BUILD_TARGETS+=$(SCHEMA_DIST)
