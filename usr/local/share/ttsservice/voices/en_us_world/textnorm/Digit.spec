# This is the digit rule which is very large and thus separated to ensure the final FST size is manageable.
# Use this rule by referring to $handle::Digit in the main rules.spec file and other files.

# A number up to billions
# Decimals are penalised because there are other special cases
TopRule = $BillionDigit{_ordinal=BillionDigit._ordinal}{_cardinal=BillionDigit._cardinal} |
        $MillionDigit{_ordinal=MillionDigit._ordinal}{_cardinal=MillionDigit._cardinal} |
        $ThousandDigit{_ordinal=ThousandDigit._ordinal}{_cardinal=ThousandDigit._cardinal} |
        [$HundredDigit{_ordinal=HundredDigit._ordinal}{_cardinal=HundredDigit._cardinal}] |
        [$TenDigit{_ordinal=TenDigit._ordinal}{_cardinal=TenDigit._cardinal}] |
        [$SingleDigit{_ordinal=SingleDigit._ordinal}{_cardinal=SingleDigit._cardinal}];