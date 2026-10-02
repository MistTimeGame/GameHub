/*
=================================================
GLOBAL VERSION
=================================================
*/


window.SITE_VERSION = "2.0.0";





document.addEventListener(
"DOMContentLoaded",
()=>{


const el =
document.getElementById(
"siteVersion"
);



if(el){


el.innerHTML =
"v" + window.SITE_VERSION;


}



});
