const { invoke } = window.__TAURI__.tauri;

async function install() {
  document.querySelectorAll('mdui-text-field')[1].value += '发起爆破请求\n'
  document.querySelector('mdui-dropdown').setAttribute("style", "display: none;")
  document.querySelector('mdui-linear-progress').removeAttribute("style")
  let isFullyDownloaded = false;
  let isSuccessfullyDownloaded = false;
  let progress = 0;
  invoke("install")
    .then(() => {
      isFullyDownloaded = true;
      isSuccessfullyDownloaded = true;
      document.querySelectorAll('mdui-text-field')[1].value += '爆破完成，正在处理数据\n'
    })
    .catch((err) => {
      isFullyDownloaded = true;
      isSuccessfullyDownloaded = false;
      document.querySelectorAll('mdui-text-field')[1].value += `爆破失败：${err}\n`
    })
  while (!isFullyDownloaded) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    (progress <= 0.95) && (progress += 0.05);
    document.querySelector('mdui-linear-progress').setAttribute('value', progress)
  }
  if (isSuccessfullyDownloaded) {
    document.querySelector('mdui-linear-progress').setAttribute('value', 1)
    document.querySelectorAll('mdui-text-field')[1].value += '正在整理数据...\n'
    invoke("run")
  }
  else {
    document.querySelector('mdui-linear-progress').removeAttribute('value')
    document.querySelectorAll('mdui-text-field')[1].value += '请再次进行爆破\n'
  }
}



window.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("mdui-menu-item").forEach(_ => _.addEventListener("click", (e) => {
    install()
  }));
});
