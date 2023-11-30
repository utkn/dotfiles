if status is-interactive
    # Commands to run in interactive sessions can go here
end

function fish_greeting
    echo "🐟 <(hey!)"
end

function last_item
    echo $history[1]
end

abbr --add !! --position anywhere --function last_item

set -x EDITOR hx
set -x VISUAL hx

set -ax PATH "$HOME/.cargo/bin"
set -ax PATH "$HOME/.local/bin"

set -x LC_ALL en_US.UTF-8
set -x LC_CTYPE en_US.UTF-8
