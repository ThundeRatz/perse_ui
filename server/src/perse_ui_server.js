#!/usr/bin/env node

// TODO -> Implementar a funcionalidade "box" da interface
// DONE -> Fazer a comunicação entre o servidor e a interface
// DONE -> Pegar informações de topicos ROS
// DONE -> criar um launchfile para abrir a interface

import { Server } from "socket.io";
import yaml from 'js-yaml';
import fs from 'fs';
import { execSync } from 'child_process';
import chalk from 'chalk';
import process from 'process'
import { spawn } from 'node-pty'

import rosnodejs from 'rosnodejs';
// Requires the std_msgs message package
// const std_msgs = rosnodejs.require('std_msgs').msg;
// import { std_msgs } from 'rosnodejs';



const log = console.log

class PerseuiServer {
  constructor(){
    this.odometry_variables = {}
    this.points = []
    this.fields = {}
    this.running = 'stopped'

    this.odometry_variables_path = ''
    this.launchfiles = {}
    this.nh
    this.io

    process.on('SIGINT', function() {
      log(chalk.yellow("[perse_ui] Shutting down..."));

      process.exit();
    });

  }

  emit_launchfile_obj(launchfile_obj){
    this.io?.emit('launchfile_is_alive', {
      domain: launchfile_obj.domain,
      launchfile: launchfile_obj.launchfile,
      running: launchfile_obj.running,
    })
  }

  createIsAliveSubscriber(launchfile_obj, topic_name, topic_type){
    const launchfile = launchfile_obj.launchfile

    const sub = this.nh.subscribe(topic_name, topic_type);

    const notRunningCallback = () => {
      log(chalk.white(`[perse_ui] ${launchfile} disconnected`))

      sub.shutdown()

      launchfile_obj.running = false
      launchfile_obj.isAliveSubscriber = this.createIsAliveSubscriber(launchfile_obj, topic_name, topic_type)
      this.emit_launchfile_obj(launchfile_obj)
    }
    const isRunningCallback = () => {
      if(launchfile_obj.running == false){
        log(chalk.white(`[perse_ui] ${launchfile} connected`))
      }
      launchfile_obj.running = true 
      this.emit_launchfile_obj(launchfile_obj)
    }


    sub.on('connection', isRunningCallback)
    sub.on('disconnect', notRunningCallback)

    return sub
  }

  getLaunchfile_obj(domain, launchfile){
    const found_launchfile = this.launchfiles[domain].find(v => v.domain == domain && v.launchfile == launchfile)
    return found_launchfile
  }

  addLaunchfile(domain, launchfile, isAliveTopic){
    try{
      const new_launchfile = {
        domain,
        launchfile,
        running: false,
      }

      if(!(domain in this.launchfiles)){
        this.launchfiles[domain] = []
      }

      const found_launchfile = this.getLaunchfile_obj(domain, launchfile)

      if(found_launchfile == undefined){
        new_launchfile.nodes = getLaunchfileNodes(domain, launchfile),
        new_launchfile.isAliveSubscriber = this.createIsAliveSubscriber(new_launchfile, isAliveTopic.name, isAliveTopic.type)

        this.launchfiles[domain].push(new_launchfile)
        this.emit_launchfile_obj(new_launchfile)
      }else{
        found_launchfile.isAliveSubscriber?.shutdown()
        found_launchfile.nodes = getLaunchfileNodes(domain, launchfile),

        found_launchfile.child?.kill()

        found_launchfile.isAliveSubscriber = this.createIsAliveSubscriber(new_launchfile, isAliveTopic.name, isAliveTopic.type)
        this.emit_launchfile_obj(found_launchfile)
      }

      log(chalk.white(`[perse_ui] added "${launchfile}" launchfile`))
    }catch(e){
      if(e.name == 'Error'){
        log(chalk.red(`[perse_ui] cannot add "${domain} ${launchfile}"`))
      }else{
        throw e
      }
    }
  }

  runLaunchfile(domain, launchfile){

    if(isLaunchfileRunning(domain, launchfile)){
      log(chalk.yellow(`[perse_ui] ${launchfile} is already running`))
      return false
    }

    const found_launchfile = this.getLaunchfile_obj(domain, launchfile)
    if(found_launchfile == undefined){
      log(chalk.yellow(`[perse_ui] ${launchfile} is not registered`))
      return false
    }
    found_launchfile.child?.kill()

    const child = spawn('roslaunch', [domain,  launchfile] ,{
      // detached: true,
      // shell: true,
      cwd: '/home/ros/ros_ws',
      name: 'xterm-color',
      env: process.env,
      cols: 80,
      rows: 30,
    })
    // const child = spawn('ls')

    child.onData((data) => {
      this.io?.emit('console_stdout', {
        domain,
        launchfile,
        stdout: data
      })
    })

    child.onExit(() => {
      log(chalk.yellow(`${domain} ${launchfile} exited successfully`))
    })

    found_launchfile.child = child
    return true
  }

  stopLaunchfile(domain, launchfile){
    if(!isLaunchfileRunning(domain, launchfile)){
      log(chalk.yellow(`[perse_ui] ${launchfile} is not running`))
      return false
    }

    const found_launchfile = this.getLaunchfile_obj(domain, launchfile)
    if(found_launchfile == undefined){
      log(chalk.yellow(`[perse_ui] ${launchfile} is not registered`))
      return false
    }

    found_launchfile.child.kill()
    // killLaunchfile(domain, launchfile, () => {
    //   found_launchfile.child.kill()
    // })

    // kill(found_launchfile.child.pid)
    // found_launchfile.child.stdin.pause()
    return true
  }

  connect(odometry_variables_path, nh, callback=()=>{}){
    this.nh = nh
    this.odometry_variables_path = odometry_variables_path


    this.io = new Server(3000, {
      cors: {
        // origin: "http://127.0.0.1:5173"
        origin: "*"
      }
    });

    this.io.on('disconnect', () => {
      log(chalk.green('[socket.io] user disconnected'))
    })

    this.io.on("connection", (socket) => {
      callback()
      log(chalk.green("[socket.io] user connected"))

      this.loadOdometryVariables(this.odometry_variables_path)

      for(let domain in this.launchfiles){
        for(let launchfile_obj of this.launchfiles[domain]){
          this.emit_launchfile_obj(launchfile_obj)
        }
      }

      socket.emit('set running', {running: this.running})

      socket.on('console_stdin', (msg) => {
        const found_launchfile = this.getLaunchfile_obj(msg.domain, msg.launchfile)
        if(found_launchfile == undefined) return

        found_launchfile.child?.write(msg.stdin)
      })

      socket.on('get points', () => {
        log(chalk.white('[socket.io] get points'))

        socket.emit('get points', {
          points: this.points
        })
        socket.emit('saved', {status: true})
      })

      socket.on('get fields', () => {
        log(chalk.white('[socket.io] get fields'))

        socket.emit('get fields', {
          fields: this.fields
        })
        socket.emit('saved', {status: true})
      })

      socket.on('run', (msg) => {
        log(chalk.white('[socket.io] run'))

        const found_launchfile = this.getLaunchfile_obj(msg.domain, msg.launchfile)
        if(found_launchfile == undefined){
          log(chalk.yellow(`[perse_ui] ${launchfile} is not registered`))
          return
        }

        this.runLaunchfile(msg.domain, msg.launchfile)
      })

      socket.on('stop', (msg) => {
        log(chalk.white('[socket.io] stop'))

        const found_launchfile = this.getLaunchfile_obj(msg.domain, msg.launchfile)
        if(found_launchfile == undefined){
          log(chalk.yellow(`[perse_ui] ${launchfile} is not registered`))
          return
        }

        this.stopLaunchfile(msg.domain, msg.launchfile)
      })


      socket.on('save', (msg) => {
        log(chalk.white('[socket.io] save'))

        const yamlStr = this.dumpOdometryVariables(msg.points, Object.fromEntries(msg.fields))

        // fs.writeFile(this.odometry_variables_path, yamlStr)

        socket.emit('saved', {status: true})
      })

    });

    log(chalk.yellow('[socket.io] Running perse_ui socket.io server on http://localhost:3000'))
  }

  loadOdometryVariables(odometry_variables_path){
      try {
        const odometry_variables = yaml.load(fs.readFileSync(odometry_variables_path, 'utf8'));

        const points = []
        const fields = {}
        for(let [k, v] of Object.entries(odometry_variables)){
          if(k.match(/^p[0-9]+/)){
            points.push({...v, index: Number(k.replace('p', ''))})
          }else{
            fields[k] = v 
          }
        }

        this.points = points
        this.fields = fields

        return true
      } catch (e) {
        console.log(e);
        this.points = []
        this.fields = {}
        return false
      }
  }

  dumpOdometryVariables(points, fields){
    const yamlObj = fields

    for(let point of points){
      const { index, key, ...new_point } = point; 

      yamlObj[`p${index}`] = new_point
    }
    const yamlStr = yaml.dump(yamlObj);

    return yamlStr
  }

}


const perseuiServer = new PerseuiServer()



rosnodejs.initNode('perse_ui_node')
.then((nh) => {

  nh.getParam('odometry_variables')
  .then((value) => {
    perseuiServer.connect(value, nh, () => {

      nh.getParam('launch_files')
      .then((value) => {

        for(let domain_launchfile in value){
          const [domain, launchfile] = domain_launchfile.split(' ') 

          perseuiServer.addLaunchfile(domain, launchfile, value[domain_launchfile].isAliveTopic)
        }

      });

    })
  });



});

function getNodeTopics(node){
  const stdout = execSync(`rosnode info ${node}`, {stdio : 'pipe' }).toString();

  const topic_regex = /^.+?(?<topic_name>\/.+?)\s\[(?<topic_type>.+?)\]/gm

  const [publishers_str, subscribers_str] = stdout.split('Subscriptions:')

  const publications = []
  const subscriptions = []

  for(let match of publishers_str.matchAll(topic_regex)){
    publications.push({
      topic_name: match.groups?.topic_name,
      topic_type: match.groups?.topic_type,
    })
  }
  for(let match of subscribers_str.matchAll(topic_regex)){
    subscriptions.push({
      topic_name: match.groups?.topic_name,
      topic_type: match.groups?.topic_type,
    })
  }

  return {publications, subscriptions}
}


function getLaunchfileNodes(domain, launchfile){
  const stdout = execSync(`roslaunch --nodes ${domain} ${launchfile}`, {stdio : 'pipe' }).toString();

  const nodes = stdout.split('\n').map(v => v.replace('/', '')).filter(v => v.length)

  return nodes
}

function getRunningNodes(){
  const stdout = execSync("rosnode list", {stdio : 'pipe' }).toString();

  const nodes = stdout.split('\n').map(v => v.replace('/', '')).filter(v => v.length)
  return nodes
}

function isLaunchfileRunning(domain, launchfile){
  const nodes_all = getRunningNodes()
  const nodes_target = getLaunchfileNodes(domain, launchfile)

  const is_target_in_all = nodes_target.reduce((p,n) => p && nodes_all.includes(n),true)

  return is_target_in_all
}

function killLaunchfile(domain, launchfile, callback){
  const nodes = getLaunchfileNodes(domain, launchfile)
  const nodes_all = getRunningNodes()

  if(nodes_all.filter(n => !nodes.includes(n)).length == 1){
    execSync('killall rosmaster')
  }else{
    execSync(`rosnode kill ${nodes.join(' ')}`)
  }
  callback()
}


