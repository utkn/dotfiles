#! /bin/bash

if pgrep -x "bemenu-run"
then 
	killall bemenu-run
else 
	bemenu-run -i -p "run" --fn 'Mono 10'
fi
