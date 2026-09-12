# The text normalisation rule specification for English.
# The rules are written in the format for the NLU parser - to find information about the parser rules see here:
# https://developers.jibo.com/sdk/docs/reference/jibo-atom-package/speech-recognition.html#
# A few conventions are used here for the purposes of TTS however.
# The TopRule matches anything and should have a variable "out" containing the fully normalised string.
# Each rule should have an _out variable which contains the result of the rules normalisation.
# The file en_us.textnorm.test contains a number of test sentences and their desired result to test the text normalisation using the jibo-tts-txp-exec.
# The rules should be compiled into an fst using the grm2fst executeable and called en_us.textnorm.fst in order to be used.

# The top rule
TopRule = $Anything{out=Anything._out} *($NormRules{out+='\<normed\>_'}{out+=NormRules._out}{out+='_\</normed\>_'} $Anything{out+=Anything._out});

# The way to get anything that should not be normalised
Anything @= $* {_out=_parsed};

#Word @= [+$c{_out=_parsed}];

# The possible highest level normalisation categories/rules
# These should all be word rules!
# We generally give abbreviations a penalty as they are "do this if nothing else applies"

NormRules = $Numbers{_out=Numbers._out} |
						$Abbreviation{_out=Abbreviation._out}~1  |
            $Measures{_out=Measures._out} |
            $Dates{_out=Dates._out} |
            $Time{_out=Time._out} |
            $Website{_out=Website._out} |
            $SpecChar{_out=SpecChar._out} |
          	$Address{_out=Address._out} |
            $PhoneNo{_out=PhoneNo._out} |
            $Maths{_out=Maths._out}~0.1 |
            $Overrides{_out=Overrides._out};
