Fake (Artificial) Languages
===========================

Tools to create custom-tailored fake languages having custom-tailored
statistical properties. This will allow the learning code to be
evaluated on the corpora generated by these languages, thus allowing
a better understanding of how the learning code is able to extract
structure from language.

The advantages of doing this:

* The ability to strictly control the size of the vocabulary.
  (This is much easier than curating a corpus of child-directed
  writing and speech, or a corpus of simple English (Simple English
  Wikipedia; Thing Explainer).

* The ability to control the grammar of the language. This includes:

  * Controlling the arity (number of dependents) that a word may have
    (e.g. transitive verbs have an arity of two: a connector to the
    subject, and a connector to the object. Common nouns have an arity
    of one: a connector to the verb.)

  * Controlling the relative frequency of nouns, verbs, modifiers.

  * Controlling the number of word-senses that a word might participate
    in, thus validating word-sense disambiguation abilities.

* The ability to control the frequency of word distributions. In natural
  language, word distributions tend to be Zipfian, and thus have a
  vocabulary dependent on the corpus size. In Hanzi languages, the
  number of Hanzi is relatively fixed, and one can potentially
  over-sample. Using an artificial language can help disentangle such
  effects.

* The ability to generate a perfect corpus, free of stray markup
  typically found in natural corpora. Natural corpora tend to have
  typesetting markup (e.g. HTML) that leaks through, no matter how
  much scrubbing is applied. Natural corpora also tend to have
  tables, indexes and lists, which are not grammatically structured
  or are only weakly structured. By using a perfect corpus, these
  can be eliminated, or they can be introduced in known ways.

* Most importantly: the ability to perform a perfect evaluation of
  the learning results, since the grammar is known exactly. The
  measurement of accuracy, precision, and recall can be measured
  precisely, without any need for a "golden reference" or
  linguist-generated reference parses.

Status
------
Basic Link Grammar flat-file dictionaries can be created.

To create a dictionary, use the
[`gen-dict.sh`](../run/1-gen-dict/gen-dict.sh)
script in the [`run/1-gen-dict`](../run/1-gen-dict) directory.
The configuration file for this is
[`run-config/1-dict-conf.scm`](../run-config/1-dict-conf.scm).

To create a corpus from the dictionary, use the
[`gen-corpus.sh`](../run/1-gen-dict/gen-corpus.sh)
script.  The configuration file for this is
[`run-config/1-corpus-conf.sh`](../run-config/1-corpus-conf.sh).


Meta-Status
-----------
Although the code 'works', its practical use is fraught with theoretical
and practical difficulties. Although a grammar generates a unique
language, and given language can be described by more than one grammar.
Thus, the process is not strictly invertible. To asses the accuracy
of the learned grammars, one must once-again generate a corpus, and
compare that. Easier said than done.

There is also the practical difficulty of debugging algorithms, when
the dataset looks like random garbage.  The grammar of English can be
eyeballed: things look right or wrong, the deduction of synonymous
words can be trivially verified. Spotting grammatical errors or incorrect
synonyms in random datasets is not possible by casual inspection. A whole
new set of tools would need to be written to do this.

Thus, the work here is temporarily paused.  It will need to be done,
eventually, but does not seem like the most fruitful avenue right now.


Theory
------
The language-learning code attempts to untangle synonyms, multiple
word senses, and "parts of speech". The goal of the artificial
grammars is to mash these up, so that the learner can untangle them.

The definitions below for "word senses", and so on, are a bit
idiosyncratic, and are tailored to the idea of a random dictionary.
They're attempting to model the conventional ideas of the same name,
but may feel a bit odd. So take these with a pinch of salt.

### POS
Roughly speaking, "parts of speech", for lack of a better name.
These are a collection of disjuncts, for example:
```
<pos-foo>: (P+ & Q-) or (R+ & T+) or (U+);
```
Link Grammar is driven by extremely fine-grained POS, so there will be
hundreds or thousands of these. (e.g. "transitive verb taking a
direct object and an indirect object but not a particle")

### Word Senses
A single word may have multiple senses. For the present case, these
correspond to words with multiple POS. For example:
```
foobar: <pos-foo> or <pos-bar>;
```

### Synonyms
For the present case, these correspond to words that have the same
POS. For example:
```
foo fu fumbled: <pos-foo>;
```

### Corpus generation
Generating syntactically valid sentences from the dictionary requires
sophisticated algorithms and is CPU intensive. By contrast, replacing
words by synonyms is easy; likewise assigning multiple senses to one
word.

Thus, the simplest approach is to first generate a corpus where there
is only one representative word per POS, followed by a second processing
step to insert multiple word senses and synonyms.  Thus, for example,
the dictionary might look like:

```
<pos-foo>: (P+ & Q-) or (R+ & T+) or (U+);
<pos-bar>: (Q+) or (X- & Y+);

Wfoo: <pos-foo>;
Wbar: <pos-bar>;
```

The corpus generated from the above contains only representative words,
so, for example:
```
Wyada Wmimble Wfoo?
Wbar Wfoo Wlump!
```
To each representative word, we can assign synonyms:
```
able baker charlie: Wyada;
```
To each word, we can assign multiple senses:
```
delta: Wbar or Wlump;
echo: Wmimble or Wlump
foxtrot: Wfoo;
```
These are substituted into the representative sentences to obtain the
the final, "real" sentences. Thus, `Wyada Wmimble Wfoo?` can become:
```
able echo foxtrot?
baker echo foxtrot?
charlie echo foxtrot?
```
while `Wbar Wfoo Wlump!` can become:
```
delta foxtrot delta!
delta foxtrot echo!
```
The word `echo` thus has two distinct word-senses, while `able baker
charlie` are synonyms for each other.


Generating a corpus
-------------------
A corpus will be generated in one of two different ways.

### Method 1 "Link Grammar"
The Link Grammar version 5.9.0 and newer distribution comes with a
sentence generation tool. Given a dictionary, it can generate all
possible sentences of a fixed length.

Note: version 5.9.0 has not yet been released. Until then, `git clone`
the repo, and `git checkout generate` to get the correct branch.

### Method 2 "The fancy way"
The "fancy way" to generate a corpus is to use a properly designed
corpus generator that can create corpora of not just natural language
sentences, but also of more complex graphs (e.g. chemistry, social
networks, etc.)

The [Network Generation project](https://github.com/opencog/generate/)
is supposed to be able to do this.  The current prototype there is able
to generate a corpus of "grammatically valid sentences" aka syntactic
trees from small grammars. It should work ... it might get slow on
grammars larger than a few dozen words, a few dozen disjuncts; such
larger generations have not yet been attempted. This is partly because
the code there is also trying to do far more sophisticated things, and
to solve far more complex problems as well.

It is slow; probably several orders of magnitude slower than the Link
Grammar generator. This is because LG has been very highly tuned for
performance over the years, whereas the AtomSpace-based generator is
in early development, barely past a proof-of-concept stage.

### Method 3 "More ideas"
Several more ways to generate text:
1. Start with sections, and build a sentence.
2. Create a random planar tree, and assign sections to it.

Approach 1. is difficult: it basically means we have to run the
parser, using a dictionary containing the desired sections, and
allowing an "any word" mode during parsing. This can be done,
because we already have scheme interfaces into LG, via the
ParseMinimalLink. But its complex and awkard.

Approach 2. is easier(?): create an unlabeled tree; that's easy.
Start adding random labels to it, verifying that each disjunct
is in the dictionary. This is harder, as this is a coloring problem,
and requires backtracking if the first coloring attempt fails.
As the final step, one randomly picks a word from the dictionary that
appears in a section for that disjunct.

HOWTO
-----
Go to the `run/1-gen-dict` directory, and use the `gen-dict.scm` file
to generate random dictionaries.

There's no user-serviceable code here, but if you must screw around in
this directory, then here's a hint:
Start the guile shell, and load the `fake` module:
```
$ guile
scheme@(guile-user)> (use-modules (opencog) (opencog nlp fake))
scheme@(guile-user)> (define dictgen (create-dict-generator 10 10 10 3 20))
scheme@(guile-user)> (print-LG-flat #t (dictgen))
```

See the file `random-dict.scm` for documentation.