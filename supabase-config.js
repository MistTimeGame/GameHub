// =====================================
// SUPABASE CONFIG
// =====================================


window.SUPABASE_URL =
"https://istzefagggvkrhwfjbox.supabase.co";


window.SUPABASE_ANON_KEY =
"sb_publishable_4s5x20f-Odw5CYCLiBbWIg_5tsF2qQL";



// =====================================
// CREATE CLIENT
// =====================================


window.supabaseClient =
supabase.createClient(

    window.SUPABASE_URL,

    window.SUPABASE_ANON_KEY,

    {

        auth:{

            persistSession:true,

            autoRefreshToken:true,

            detectSessionInUrl:true,

            storage:window.localStorage

        }

    }

);



// =====================================
// AUTH HELPERS
// =====================================


window.getCurrentSession = async function(){


    const {

        data,

        error

    } =
    await window.supabaseClient
    .auth
    .getSession();



    if(error){

        console.error(
            "Session error:",
            error
        );

        return null;

    }



    return data.session;

};




window.requireAuth = async function(){


    const session =
    await window.getCurrentSession();



    if(!session){


        console.log(
            "Нет активной сессии"
        );


        return null;

    }



    return session.user;

};
