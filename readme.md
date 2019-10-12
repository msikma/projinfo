## `projinfo`

A script that displays basic information about the project in the current directory. It's useful for getting a quick reminder of a project's tooling and how to start working on it. It can be made to run automatically when `cd`'ing into a project directory.

**Example output:**

![Screenshot of projinfo output](assets/projinfo_output.png?raw=true)

### Why is this useful?

I've found it helpful to get a quick reminder of how a project works whenever I change to its directory. Especially for my own projects I haven't worked on in a while, and other people's projects that I've never worked on.

In Node projects in particular, it's annoying when you run `yarn` when a project really needs `npm` or `lerna`, or `npm run build` when it's really `npm run compile`. For Python projects, using 3 when you really need 2 can be confusing.

### Support

Since this is just my personal project, it only supports the file and project types I commonly work on.

The script displays whatever information is available to it. It uses the following files to produce its output:

* Javascript/Node - `package.json`, `yarn.lock`, `lerna.json`
* Python 2/3 - `setup.py`, `setup.cfg`, `requirements.txt`
* PHP - `composer.json`
* ZEIT Now - `now.json`
* Documentation - `.md`, `.rst`, `.txt`

### Running automatically on directory change

This script should be set up so that it triggers automatically whenever entering a project.

### Bash shell

On Bash, defining a `cd` function in `~/.bash_profile` will work:

```bash
function cd {
  # Actually change directory. <https://superuser.com/a/283365>
  builtin cd "$@"
  
  # Run a quick check to see if this is a project directory.
  if
    [ ! -f './package.json' ] &&
    [ ! -f './requirements.txt' ] &&
    [ ! -f './setup.py' ] &&
    [ ! -f './setup.cfg' ] &&
    [ ! -f './composer.json' ]; then
    return
  fi
  
  # Display project info.
  projinfo
}
```

### Fish shell

On Fish Shell, the script should run on a change of the `dirprev` variable:

```fish
function display_project_info \
  --description 'Displays project info after changing to a project directory' \
  --on-variable dirprev

  # Run a quick check to see if this is a project directory.
  if begin
    [ ! -f ./package.json ]; and \
    [ ! -f ./requirements.txt ]; and \
    [ ! -f ./setup.py ]; and \
    [ ! -f ./setup.cfg ]; and \
    [ ! -f ./composer.json ]; end
    return
  end

  # Return if this is isn't a command directly run by the user themselves in the shell.
  if status --is-command-substitution
    return
  end

  # Display project info.
  projinfo
end
```

### License

MIT license.
