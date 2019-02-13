workflow "Build and Deploy" {
  on = "push"
  resolves = ["Deploy"]
}

action "Install Dependencies" {
  uses = "actions/npm@4633da3702a5366129dca9d8cc3191476fc3433c"
  args = "install"
}

action "Build Site" {
  uses = "srt32/hugo-action@v0.0.3"
  needs = ["Install Dependencies"]
}

action "Minimize Site" {
  uses = "actions/npm@4633da3702a5366129dca9d8cc3191476fc3433c"
  needs = ["Build Site"]
  args = "run minify"
}

action "Master Only" {
  uses = "actions/bin/filter@46ffca7632504e61db2d4cb16be1e80f333cb859"
  needs = [
    "Minimize Site",
  ]
  args = "branch master"
}

action "Deploy" {
  uses = "docker://alpine:latest"
  needs = ["Master Only"]
  args = "echo \"test\""
}
