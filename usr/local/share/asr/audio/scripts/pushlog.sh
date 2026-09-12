#!/bin/sh

#filename=$(basename "$1")
absolute_filename=$1
filename_no_ext="${absolute_filename%.*}"
echo $filename_no_ext
bzip2 -z $absolute_filename
curl -u "kebab:shashlik1" -k -F "file_1=@${absolute_filename}.bz2" https://52.2.27.243/logdrop/logdrop.py
