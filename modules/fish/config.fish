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

# MacOS Homebrew setup
if test -d /opt/homebrew
    set -x HOMEBREW_PREFIX /opt/homebrew
    set -x HOMEBREW_CELLAR "$HOMEBREW_PREFIX/Cellar"
    set -x HOMEBREW_REPOSITORY "$HOMEBREW_PREFIX/homebrew"
    set -px PATH "$HOMEBREW_PREFIX/bin"
    set -px PATH "$HOMEBREW_PREFIX/sbin"
end

# helix (hx binary)
if type -q hx
    set -x EDITOR hx
    set -x VISUAL hx
end

# helix (helix binary)
if type -q helix
    set -x EDITOR helix
    set -x VISUAL helix
    abbr --add hx helix
end

# rust cargo
if test -d "$HOME/.cargo"
    set -ax PATH "$HOME/.cargo/bin"
end

if test -d "$HOME/.local/bin"
    set -ax PATH "$HOME/.local/bin"
end

set -x LC_ALL en_US.UTF-8
set -x LC_CTYPE en_US.UTF-8
