window.openModule = async function(module){


    const container =
    document.getElementById(
        module + "-container"
    );


    if(!container){

        return;

    }



    let file =
    `modules/${module}/${module}.html`;



    try{


        let response =
        await fetch(file);



        if(!response.ok){

            throw new Error(
            "404 " + file
            );

        }



        let html =
        await response.text();



        container.innerHTML = html;



        if(module==="auth"){

            await import(
            "../../modules/auth/auth.js"
            );

        }



        if(module==="profile"){

            await import(
            "../../modules/profile/profile.js"
            );

        }




        if(module==="games"){

            await import(
            "../../modules/games/games.js"
            );

        }



        if(module==="guilds"){

            await import(
            "../../modules/guilds/guilds.js"
            );

        }



        if(module==="conference"){

            await import(
            "../../modules/conference/conference.js"
            );

        }



    }
    catch(e){

        console.error(e);

        container.innerHTML =
        `
        <div class="error">
        Модуль ${module} пока не создан
        </div>
        `;

    }


};





// стартовая загрузка

openModule("auth");
