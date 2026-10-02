// supabase-config.js

const SUPABASE_URL = 
"https://istzefagggvkrhwfjbox.supabase.co";


const SUPABASE_KEY =
"sb_publishable_4s5x20f-Odw5CYCLiBbWIg_5tsF2qQL";



const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
        auth:{
            persistSession:true,
            autoRefreshToken:true,
            detectSessionInUrl:true,
            storage:window.localStorage
        }
    }
);



async function getSession(){

    const {
        data,
        error
    } = await supabaseClient.auth.getSession();


    if(error){

        console.error(
            "SESSION ERROR",
            error
        );

        return null;
    }


    return data.session;
}



async function requireAuth(){


    const session =
        await getSession();



    if(!session){


        console.log(
            "Сессия отсутствует"
        );


        window.location.href =
        "index.html";


        return null;
    }



    return session.user;

}
