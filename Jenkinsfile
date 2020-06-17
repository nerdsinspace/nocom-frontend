#!groovy

node {
  try {
    // Checkout the proper revision into the workspace.
    stage('checkout') {
      checkout scm
    }

    // Execute `update` wrapped within a plugin that translates
    // ANSI color codes to something that renders inside the Jenkins
    // console.
//    stage('update') {
//      wrap([$class: 'AnsiColorBuildWrapper']) {
//        sh './scripts/update'
//      }
//    }

    // Execute `cibuild` wrapped within a plugin that translates
    // ANSI color codes to something that renders inside the Jenkins
    // console.
    stage('cibuild') {
      wrap([$class: 'AnsiColorBuildWrapper']) {
        sh './scripts/cibuild'
        archiveArtifacts artifacts: 'dist/*', fingerprint: true
      }
    }

    withCredentials([usernamePassword(credentialsId: 'nocom-frontend-gitlab-docker-registry', passwordVariable: 'GITLAB_PASSWORD', usernameVariable: 'GITLAB_USER')]) {
      stage('cipublish') {
        wrap([$class: 'AnsiColorBuildWrapper']) {
          sh './scripts/cipublish'
        }
      }
    }
  } catch (err) {
    // Re-raise the exception so that the failure is propagated to
    // Jenkins.
    throw err
  } finally {
    // Pass or fail, ensure that the services and networks
    // created by Docker Compose are torn down.
    sh 'docker-compose -f docker-compose.ci.yml down -v'
  }
}
