workflow "New workflow" {
  on = "push"
  resolves = ["Action Hugo"]
}

action "Action Hugo" {
  uses = "kevvurs/action-hugo@v1.0-rc2"
}
