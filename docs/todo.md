
# Hot Actions items:

 - [ ] test multiple configurations (with and without multi-host)
 - [ ] fix root file prb (use volume for fabric-ca and check cp credentials)
 - [ ] minimize docker image (multistage)
 - [ ] improve logging level and clarity (clearer steps = easier remote debug)
 - [ ] add e2e & unit test file 

#### Issues:

 - [ ] test again DNS without hosts section 
 - [ ] re-enable docker remote API call (use engine section and remove hardcoded socketPath)
 - [ ] remove 'docker volume prune' from clear command (fix volume naming + label)
 - [ ] mv template_folder entry in default constant
 - [ ] test again without dockerized bnc
 - [ ] add flag to enable low HLF logging level
 - [ ] enable multi-orgs in single file (fix organizations[0])
 - [ ] auto-stop container of peers and orderers if redeploy action is triggered
 - [ ] check docker container status once deployed (check if not exited)


