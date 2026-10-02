// supabase-config.js

const SUPABASE_URL = "https://istzefagggvkrhwfjbox.supabase.co";

const SUPABASE_KEY = "sb_publishable_4s5x20f-Odw5CYCLiBbWIg_5tsF2qQL";


const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }
);


// Проверка пользователя

async function getCurrentUser(){

    const {
        data,
        error
    } = await supabaseClient.auth.getSession();


    if(error){
        console.error(error);
        return null;
    }


    if(!data.session){
        return null;
    }


    return data.session.user;
}



// Требовать авторизацию

async function requireAuth(){

    const user = await getCurrentUser();


    if(!user){

        alert(
            "Необходимо войти в аккаунт"
        );

        location.href="index.html";

        return null;
    }


    return user;
}
