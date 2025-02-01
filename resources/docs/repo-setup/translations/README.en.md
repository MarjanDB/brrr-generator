# Repository Setup

## Cloning the repository

```bash
git clone git@github.com:MarjanDB/brrr-generator.git
```

## Setting up the environment

### Git config

First include the `.gitconfig` file in the root of the repository.
This adds a filter to strip the output from the notebooks to the repository.
This isn't required, but it will make it so you don't have to do it manually every time you run the notebooks.
If you're getting errors because you decided not to run this,
then remove the filter call from `.gitattributes`.

```bash
git config --local include.path ../.gitconfig
```

### Dependencies

While this environment is using PipEnv, it should work with other environments.
Instructions for those are not included as I'm only familiar with PipEnv,
but feel free to open up a pull request with instructions on how to do it in other environments.
#### PipEnv

```bash
pipenv install
pipenv shell
```

## **Pitfalls**

This repository was developed using VSCode.
As a result, most configurations are VSCode specific.
I'm not sure if it will work in other IDEs, but it should be just fine as long as you apply the environment variables specified in the `.env` file.


