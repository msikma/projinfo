## `projinfo`

Displays basic information about the project in the current directory.

Example output:

![Screenshot of projinfo output](assets/projinfo_output.png?raw=true)

The script displays as much information as it's able to get. It uses the following filetypes to produce its output:

* Javascript/Node - `package.json`, `yarn.lock`, `lerna.json`
* Python 2/3 - `setup.py`, `setup.cfg`, `requirements.txt`
* PHP - `composer.json`
* ZEIT Now - `now.json`
* Documentation - `.md`, `.rst`, `.txt`

### Running automatically on directory change

This script should be set up so that it triggers automatically whenever entering a project folder. On Fish Shell it needs to run on a change of the `dirprev` variable:

```fish
function check_node_project \
  --description 'Display project info if we changed to a Node project directory' \
  --on-variable dirprev

  # Don't display project info if:
  status --is-command-substitution; # this is command substitution \
    or not test -f ./package.json; # there's no package.json \
    or [ (count $dirprev) -lt 2 ]; # we've just opened a new Terminal session \
    # Uncomment this if you only want the project info to be shown when coming from a lower directory.
    # or [ (count (string split $PWD $dirprev[-1])) -eq 2 ]; # we came from a lower directory in the hierarchy \
    and return

  # Displays project name, version, and a list of bin files, npm scripts and docs.
  projinfo
end
```

### License

MIT license.
