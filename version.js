/* =====================================
   SITE VERSION
   ===================================== */


window.SITE_VERSION = "2.0.0";



document.addEventListener(
"DOMContentLoaded",
()=>{


const versionBlock =
document.getElementById(
"siteVersion"
);



if(versionBlock){


versionBlock.innerText =
"v" + window.SITE_VERSION;


}


});