const { invoke } = window.__TAURI__.tauri;

function logger(text) {
  document.getElementById("logger").value += text + '\n';
}

document.getElementsByTagName('mdui-button')[0].addEventListener('click', async () => {
  document.getElementsByTagName('mdui-button')[0].setAttribute('disabled', "true")
  document.getElementById('line').removeAttribute('style')
  document.getElementById("logger").removeAttribute('style')
  logger('连接至服务器中...')
  let downloaded = false;
  let success = false;
  let progress = 0;
  invoke('install').then(() => {
    downloaded = true;
    success = true;
    logger('收到注册完成响应...')
  }).catch((e) => {
    downloaded = true;
    success = false;
    logger(`收到失败响应: ${e}...`)
  })
  logger('服务器连接成功...')
  logger('发起任务中...')
  await new Promise((resolve) => setTimeout(resolve, 3000));
  while (!downloaded) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    (progress <= 0.95) && (progress = progress + 0.05);
    document.getElementById('line').setAttribute('value', progress)
    logger('注册成功 undefined 个，剩余 undefined 个...')
  }
  if (success) {
    logger('注册完成，发起获取任务中...')
    document.getElementById('line').remove()
    document.getElementById("circle").removeAttribute('style')
    new Promise((resolve) => setTimeout(resolve, 3000)).then(() => {
      logger('发起成功，正在接收...')
      invoke("run")
      logger('接收成功，正在保存...')
    })

  }
  else {
    logger('注册失败，请尝试重新运行！')
    document.getElementById('line').remove()
  }
})