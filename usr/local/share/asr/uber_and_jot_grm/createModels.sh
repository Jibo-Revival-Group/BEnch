export TNT_EXE=/home/sridhar/Sensory/TrulyNaturalSDK/0.7.1/x86_64-linux/bin/tnt
export SDK_INSTALL_DIR=/home/sridhar/Sensory/TrulyNaturalSDK
export VERSION=0.7.1
export LANGUAGE_PACK=en_us_16kHz_v11
export LTS=lts_en_us_12.1.4.raw
export ACMODEL=nn_en_us_fbank_16k_3_500_v12.0.0.raw

cp $SDK_INSTALL_DIR/$VERSION/Data/$LANGUAGE_PACK/nn_en_us_fbank_16k_3_500_v12.0.0_hc.ltran hc.ltran

$TNT_EXE convert -overwrite hc.ltran att

#/home/sridhar/Downloads/asr/mitlm-0.4.1/estimate-ngram -t corpus.txt -wl g.arpa

$TNT_EXE compile -overwrite g.grm g.att

$TNT_EXE dictionary -overwrite -Sphinx g.att $SDK_INSTALL_DIR/$VERSION/Data/$LANGUAGE_PACK/$LTS g.lex

$TNT_EXE compile -overwrite g.lex -amfile $SDK_INSTALL_DIR/$VERSION/Data/$LANGUAGE_PACK/$ACMODEL l.att

fstcompile --isymbols=l.out.syms --osymbols=g.out.syms g.att g_.fst
fstrmepsilon g_.fst | fstdeterminize | fstminimize > g.fst

fstcompile --isymbols=hc.out.syms --osymbols=l.out.syms l.att l.fst

fstcompile --isymbols=hc.in.syms --osymbols=hc.out.syms hc.att hc.fst


fstarcsort g.fst | fstcompose l.fst - > lg_.fst
fstrmepsilon lg_.fst | fstdeterminize| fstminimize > lg.fst
fstarcsort lg.fst | fstcompose hc.fst - > hclg_.fst
fstrmepsilon hclg_.fst | fstdeterminize| fstminimize > hclg.fst
fstprint --isymbols=hc.in.syms --osymbols=g.out.syms hclg.fst hclg.att

$TNT_EXE convert -overwrite hclg.att ltran
