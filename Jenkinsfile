#!groovy

node {
  final isMaster = 'master' == env.BRANCH_NAME
  def dockerfile

  // Checkout the proper revision into the workspace.
  stage('checkout') {
    checkout scm
  }

  docker.withRegistry('https://registry.gitlab.com/', 'gitlab-deploy-token_nocom-frontend') {
    stage('build') {
      wrap([$class: 'AnsiColorBuildWrapper']) {
        dockerfile = docker.build('nerdsinc/nocom-frontend', '--no-cache --rm --pull .')
      }
    }

    stage('publish') {
      if (isMaster) {
        wrap([$class: 'AnsiColorBuildWrapper']) {
          dockerfile.push()
        }
      } else {
        echo "Not publishing $env.BRANCH_NAME"
      }
    }
  }

//  stage('deploy') {
//    if (isMaster) {
//      wrap([$class: 'AnsiColorBuildWrapper']) {
//        dir('deployment') {
//          sh 'ansible-galaxy install -r roles.yml'
//
//          withCredentials([
//            string(credentialsId: 'sudo-password_nocomvm-deployer', variable: 'ANSIBLE_SUDO_PASS'),
//            usernamePassword(
//              credentialsId: 'gitlab-deploy-token_nocom-frontend',
//              usernameVariable: 'GITLAB_DEPLOY_TOKEN_USERNAME',
//              passwordVariable: 'GITLAB_DEPLOY_TOKEN_PASSWORD'
//            )
//          ]) {
//            ansiblePlaybook(
//              playbook: 'playbook.yml',
//              credentialsId: 'ssh-private-key_nocomvm',
//              colorized: true
//            )
//          }
//        }
//      }
//    } else {
//      echo "Not deploying $env.BRANCH_NAME"
//    }
//  }
}
