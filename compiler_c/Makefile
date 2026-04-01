CC=gcc
CFLAGS=-Wall -Wextra -g

all: compiler

compiler: main.o lexer.o parser.o codegen.o opt.o json_output.o
	$(CC) $(CFLAGS) -o compiler main.o lexer.o parser.o codegen.o opt.o json_output.o

main.o: main.c lexer.h parser.h codegen.h json_output.h
	$(CC) $(CFLAGS) -c main.c

lexer.o: lexer.c lexer.h
	$(CC) $(CFLAGS) -c lexer.c

parser.o: parser.c parser.h lexer.h
	$(CC) $(CFLAGS) -c parser.c

codegen.o: codegen.c codegen.h parser.h
	$(CC) $(CFLAGS) -c codegen.c

opt.o: opt.c parser.h
	$(CC) $(CFLAGS) -c opt.c

json_output.o: json_output.c json_output.h lexer.h parser.h
	$(CC) $(CFLAGS) -c json_output.c

clean:
	del *.o compiler.exe