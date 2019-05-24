## `projinfo`

Displays basic information about the project in the current directory.

Example output:

```
msikma-lib-projects (1.0.0) <https://github.com/msikma/msikma-lib-projects>
Monorepo container for msikma-lib-projects, containing a number of client libraries
Last commit: 2018-10-14 22:29:35 +0200 (63 minutes ago)

lerna | bootstrap (20 packages) |
 yarn │ run compile             │ bin buyee-cli           │ doc readme.md
      │     dev                 │     marktplaats-cli     │     license.md
      │                         │     mlib                │     todo.md
```

The script displays as much information as it's able to get. It reads data from the following filetypes:

* `package.json`, `lerna.json`, `yarn.lock` - Javascript/Node
* `setup.py`, `setup.cfg` - Python
* `composer.json` - PHP

### Running automatically on directory change

This script should be set up so that it triggers automatically whenever entering a project folder. On Fish Shell it needs to run on a change of the `dirprev` variable.

To set up a trigger so that this script gets run whenever entering a project folder, on Fish Shell it needs to run on a change of the 'dirprev' variable:

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
  project.js
end
```

### License

MIT license.
