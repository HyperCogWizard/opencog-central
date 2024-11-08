;
; pipe-count.scm -- Parse counting via Atomese pipe.
;
; Parses a stream of input, and updates counts based on parse results.
; The type of parser, and the type of input data being processed, is
; meant to be generic. Currently, its only been used with the Link
; Grammar parser, to count text streams.
;
; Multiple ideas are being explored in this code:
; 1) How to best construct pipeline processing components, along the
;    design philosophies articulated at the sensory and agent projects:
;    https://github.com/opencog/sensory
;    https://github.com/opencog/agents
;
; 2) This includes avoiding the `matrix` API, but being vaguely
;    backwards compat with it, for now. The matrix API is slow; it
;    incurs very heavy thrashing of the guile GC. It is also not
;    Atomese, and cannot be access from within Atomese.
;
; 3) The code here is derived from the example in the agents examples
;    directory, here:
;    https://github.com/opencog/agents/tree/master/examples/pair-count.scm
;
; How this works: the main entry point `make-parse-pipe` accepts a
; parser, which, when executed, is supposed to generate two streams of
; countable Atoms. A count is incremented on each Atom in each stream,
; and then is written out to the indicated StorageNode.
;
; Examples of streams include:
; * The streams generated by LgParseBonds. One stream is a stream of
;   words (from some observed text), the other is a stream of
;   word-pairs (generated by the parser). The "any" dict generates
;   random word-pairs, while other dicts generate word pairs from other
;   structures.
; * The stream from LgParseSection consists of Sections, and a stream
;   of the individual Edges in that Section. (The edges are effectively
;   word-pairs, although this depends on the dictionary.)
;
; TODO:
; * Need ((add-count-api LLOBJ) 'count-key) to replace hard-coded count
;   But this is not urgent, because the count-api itself is hard coded.

(use-modules (opencog) (opencog exec) (opencog persist))
(use-modules (opencog nlp) (opencog nlp lg-parse))
(use-modules (opencog matrix))
(use-modules (srfi srfi-1))

; ---------------------------------------------------------------------
; --------------------------------------------------------------
(define-public (make-parse-pipe PARSE-STREAM STORAGE PARSE-CNT)
"
  make-parse-pipe PARSE-STREAM STORAGE PARSE-CNT - Create and return a
  counter that increments counts on Atoms being delivered via the
  PARSE-STREAM.

  This counter takes a stream of parsing results (a stream of Atoms),
  generated on PARSE-STREAM, increments the count on each Atom, and
  then stores the Atoms to STORAGE. For each specific parse, the count
  on the Atom PARSE-CNT is incremented by one.

  A very specific format is assumed for the parse-stream; it is assumed
  to be stream of parses, with each parse being two distinct streams of
  Atoms. This is exactly the format generated by both LgParseBonds
  and LgParseSections, and so this counter can count observed words,
  edges and sections.

  The counting is done entirely in Atomese, not scheme.
  Requires the following arguments:
    PARSE-STREAM should be either (LgParseBonds ...) or (LgParseSections ...)
    STORAGE a StorageNode
    PARSE-CNT an Atom which is incremented for each parse.

  Experimental; subject to change. The long term goal is to migrate to
  the sensory-agent API. The current structure here is a bit hacky.
"
	;
	; Pipeline steps, from inside to out:
	; * PARSE-STREAM tokenizes a sentence, and then parses it.
	; * The PureExecLink makes sure that the parsing is done in a
	;   sub-AtomSpace so that the main AtomSpace is not garbaged up.
	;
	; The result of parsing is a list of pairs. The type of the pairs
	; depends on the PARSE-STREAM. For PARSE-STREAM == LgParseBonds, the first
	; item in a pair is the list of words in the sentence; the second
	; is a list of the edges. Thus, each pair has the form
	;     (LinkValue
	;         (LinkValue (Word "this") (Word "is") (Word "a") (Word "test"))
	;         (LinkValue (Edge ...) (Edge ...) ...))
	; For PARSE-STREAM == LgParseSections, the first item in a pair is a
	; list of Sections, the section is a list of Edges. Much as above,
	; each pair has the form
	;     (LinkValue
	;         (LinkValue (Section ...) (Section ...) ...)
	;         (LinkValue (Edge ...) (Edge ...) ...))
	;
	; The outer Filter matches this, so that (Glob "$edge-list") is
	; set to the LinkValue of Edges.
	;
	; The inner Filter loops over the list of edges, and invokes a small
	; pipe to increment the count on each edge.
	;
	; The counter is a non-atomic pipe of (SetValue (Plus 1 (GetValue)))
	; For now, non-atomic counting seems acceptable. It appears to
	; reduce hardwre cache-line lock contention!

	; Compatible with opencog/matrix/count-api.scm
	; Due to ancient history, we increment the third location.
	(define COUNT-PRED (PredicateNode "*-TruthValueKey-*"))
	(define COUNT-ZERO (Number 0 0 0))
	(define COUNT-ONE (Number 0 0 1))

	; Increment the count on one atom.
	; If the count is not available, it is fetched from storage.
	; If there is no count in storage, it is set to zero.
	(define (incr-cnt atom)
		(SetValue atom COUNT-PRED
			(Plus COUNT-ONE
				(FloatValueOf atom COUNT-PRED
					(FetchValueOf atom COUNT-PRED STORAGE
						(FloatValueOf COUNT-ZERO))))))

	(define (store-cnt atom)
		(StoreValueOf atom COUNT-PRED STORAGE))

	; Given a list (an Atomese LinkValue list) of Atoms,
	; increment the count on each Atom.
	(define (atom-counter ATOM-LIST)
		(Filter
			(Rule
				; We could type for safety, but seems like no need...
				; (TypedVariable (Variable "$atom")
				;       (TypeChoice (Type 'Edge) (Type 'Word)))
				(Variable "$atom") ; vardecl
				(Variable "$atom") ; body to match
				(incr-cnt (Variable "$atom"))
				(store-cnt (Variable "$atom"))
			)
			ATOM-LIST))

	; Given PASRC holding a stream of parses, split it into a list of
	; words, and a list of edges, and apply FUNKY to both lists.
	(define (stream-splitter PASRC FUNKY)
		(Filter
			(Rule
				(LinkSignature
					(Type 'LinkValue)
					(Variable "$word-list")
					(Variable "$edge-list"))
				; Apply the function FUNKY to the word/section and edge lists.
				(FUNKY (Variable "$word-list"))
				(FUNKY (Variable "$edge-list"))
				; Increment by one for each parse
				(incr-cnt PARSE-CNT)
				(store-cnt PARSE-CNT))
			PASRC))

	; Return the assembled counting pipeline.
	; All that the user needs to do is to call `cog-execute!` on it,
	; until end of file is reached.
	(stream-splitter PARSE-STREAM atom-counter)
)

; ---------------------------------------------------------------------
; ---------------------------------------------------------------------
;
; These sets up a processing pipeline in Atomese, and returns that
; pipeline. The actual parsing all happens in C++ code, not in scheme
; code. The scheme here is just to glue the pipeline together.
;
; See `attic/pair-count-new/word-pair-count.scm` for a detailed
; description of the how-and-why of all this.
(define-public (make-random-pair-parser txt-stream STORAGE)
"
  make-random-pair-parser TXT-STREAM STORAGE - Count random word pairs.

  Return a text parser that counts words and random word-pairs obtained
  from parsing text on TXT-STREAM. The TXT-STREAM must be an Atom that,
  when executed, delivers a stream of text. In the typical case, the
  TXT-STREAM atom will be
     (ValueOf (Concept \"some atom\") (Predicate \"some key\"))
  and the Value there will provide a LinkStream of text to be parssed
  and counted.

  Counts in the parse stream are incremented, and then written out to
  STORAGE, which must be a StorageNode.

  The Link Grammar (LgDict \"any\") is used for parsing. This dict creates
  random planar graphs. The graph edges are the random word-pairs that
  get counted.
"
	(define NUML (Number 6))
	(define DICT (LgDict "any"))
	(define any-parse (ParseNode "ANY"))

	; XXX Hack to fetch sentence count from storage. XXX we should not
	; do it this way, and use a cleaner design but I'm in a hurry so....
	; XXX Need to fetch any-parse, too.
	; (define any-sent (SentenceNode "ANY"))
	; (cog-execute! (FetchValueOf any-sent COUNT-PRED STORAGE
	;    (FloatValueOf COUNT-ZERO)))

	(define parser (LgParseBonds txt-stream DICT NUML))

	; Return the assembled counting pipeline.
	; All that the user needs to do is to call `cog-execute!` on it,
	; until end of file is reached.
	(make-parse-pipe parser STORAGE any-parse)
)

; ---------------------------------------------------------------------
;
; Exactly like the above. Sadly, the dict is hard-coded, etc. This
; is a shim, for now.
(define-public (make-disjunct-parser TXT-STREAM STORAGE)
"
  make-disjunct-parser TXT-STREAM STORAGE - Count disjuncts.

  Return a text parser that counts Edges and Sections obtained
  from MST/MPG parsing text on TXT-STREAM. The TXT-STREAM must be
  an Atom that, when executed, delivers a stream of text. In the
  typical case, the TXT-STREAM atom will be
     (ValueOf (Concept \"some atom\") (Predicate \"some key\"))
  and the Value there will provide a LinkStream of text to be parssed
  and counted.

  Counts in the parse stream are incremented, and then written out to
  STORAGE, which must be a StorageNode.

  The Link Grammar (LgDict \"dict-pair\") is used for parsing. This dict
  creates MST/MPG planar graphs, maximing the sum of MI of the edges
  occuring in the parse.
"
	; Top-three MST parses are probably the only good ones.
	(define NUML (Number 3))
	(define DICT (LgDict "dict-pair"))
	(define mst-parse (ParseNode "MST"))

	(define parser (LgParseSections TXT-STREAM DICT NUML (cog-atomspace)))

	; Return the assembled counting pipeline.
	; All that the user needs to do is to call `cog-execute!` on it,
	; until end of file is reached.
	(make-parse-pipe parser STORAGE mst-parse)
)

; ---------------------------------------------------------------------
; ---------------------------------------------------------------------
