GEOS = /opt/homebrew/Cellar/geos/3.12.1/include/
LDFLAGS="-L/opt/homebrew/lib"

all:
  # 1. Copy all *.mjs and *.py files from the src directory to the out directory
  #    since they do not need to be compiled
	cp src/*.mjs out/ 
	cp src/*.py out/ 
  
  # 2. Build the C code
	clang -O3 -I$(GEOS) -o out/contains.outc src/contains.c $(LDFLAGS) -lgeos_c
  
  # 3. Build the Rust code
	cargo build --release
  # The output file is out/contains -> rename to out/contains.outrs
	mv target/release/contains out/contains.outrs

install:
	brew install geos
	pip3 install -r requirements.txt
	npm install

run:
  # Run the benchmark
	bun ./benchmark.mjs