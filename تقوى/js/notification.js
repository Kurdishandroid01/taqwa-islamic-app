import adhanModule from './modules/adhanModule.js';
import errorHandling from './modules/error_handling.js';
import getGPS from './modules/getGPS.js';
import {
    scheduleLocalNotification,
    updateLocalNotification,
    cancelLocalNotification,
    isLocalNotificationExists,
    ClickEvent
} from "./modules/LocalNotification.js";
import moment from './modules/moment/moment.js';
import moment_timezone from './modules/moment/moment-timezone.js';
moment_timezone(moment);

export default async () => {

    try {

        // LocalStorage 

        let localStorageData = window.localStorage;
        let calculationMethod = localStorageData.getItem('Calculation_settings');
        let madhab = localStorageData.getItem('madhab_settings');
        let shafaqMethod = localStorageData.getItem('Shafaq_settings');
        let fajrAngle = localStorageData.getItem('fajr_settings');
        let sunriseAngle = localStorageData.getItem('sunrise_settings');
        let dhuhrAngle = localStorageData.getItem('dhuhr_settings');
        let asrAngle = localStorageData.getItem('asr_settings');
        let maghribAngle = localStorageData.getItem('maghrib_settings');
        let ishaAngle = localStorageData.getItem('isha_settings');
        let latitude = localStorageData.getItem('latitude_settings');
        let longitude = localStorageData.getItem('longitude_settings');
        let timezone = localStorageData.getItem('timezone_settings');
        let notificationEnabled = localStorageData.getItem('notifications_adhan');


        if (longitude === null || latitude === null || timezone === null) {

            let GPS = await getGPS();
            latitude = GPS.latitude;
            longitude = GPS.longitude;
            timezone = GPS.timezone;
            localStorageData.setItem("latitude_settings", latitude);
            localStorageData.setItem("longitude_settings", longitude);
            localStorageData.setItem("timezone_settings", timezone);

        }

        setInterval(async () => {
            if (notificationEnabled ? bool(notificationEnabled) : true) {
                const timeNow = moment().tz(timezone).format('h:mm A');
                let prayerTimes = adhanModule({
                    Calculation: calculationMethod ? calculationMethod : "UmmAlQura",
                    latitude: Number(latitude),
                    longitude: Number(longitude),
                    timezone: timezone,
                    madhab: madhab ? madhab : "Shafi",
                    Shafaq: shafaqMethod ? shafaqMethod : "General",
                    fajr: fajrAngle ? Number(fajrAngle) : 0,
                    sunrise: sunriseAngle ? Number(sunriseAngle) : 0,
                    dhuhr: dhuhrAngle ? Number(dhuhrAngle) : 0,
                    asr: asrAngle ? Number(asrAngle) : 0,
                    maghrib: maghribAngle ? Number(maghribAngle) : 0,
                    isha: ishaAngle ? Number(ishaAngle) : 0,
                });

                const fileAdhan = prayerTimes.nextPrayer === "fajr" ? "/mp3/002.mp3" : "/mp3/001.mp3"

                switch (timeNow) {
                    case prayerTimes?.fajr:
                        await notificationAdhan("الفجر", fileAdhan, localStorageData, prayerTimes?.fajr);
                        await iiqamaTime("الفجر", prayerTimes?.fajr, 25);
                        break;
                    case prayerTimes?.dhuhr:
                        await notificationAdhan("الظهر", fileAdhan, localStorageData, prayerTimes?.dhuhr);
                        await iiqamaTime("الظهر", prayerTimes?.dhuhr, 20);
                        break;
                    case prayerTimes?.asr:
                        await notificationAdhan("العصر", fileAdhan, localStorageData, prayerTimes?.asr);
                        await iiqamaTime("العصر", prayerTimes?.asr, 20);
                        break;
                    case prayerTimes?.maghrib:
                        await notificationAdhan("المغرب", fileAdhan, localStorageData, prayerTimes?.maghrib);
                        await iiqamaTime("المغرب", prayerTimes?.maghrib, 10);
                        break;
                    case prayerTimes?.isha:
                        await notificationAdhan("العشاء", fileAdhan, localStorageData, prayerTimes?.isha);
                        await iiqamaTime("العشاء", prayerTimes?.isha, 20);
                        break;
                    default:
                        break;
                }
            }
        }, 6000);

    } catch (error) {

        errorHandling(error);

    }

}

function bool(value) {
    return value === "false" || value === "null" || value === "NaN" || value === "undefined" || value === "0" ? false : !!value;
}

async function notificationAdhan(name, fileAdhan, localStorageData, time) {

    let adhanPlaying = localStorageData.getItem('AdhanPlaying');
    adhanPlaying === null ? localStorageData.setItem('AdhanPlaying', "false") : false;

    if (!bool(adhanPlaying)) {

        let audioAdhan = new Audio(fileAdhan);
        audioAdhan.id = 'audioAdhan';
        audioAdhan.loop = false;
        audioAdhan.preload = 'none';
        audioAdhan.autoplay = false;

        localStorageData.setItem('AdhanPlaying', "true");

        await audioAdhan.play();

        audioAdhan.addEventListener('ended', () => {
            audioAdhan.pause();
            audioAdhan.currentTime = 0;
            cancelLocalNotification(5);
            localStorageData.setItem('AdhanPlaying', "false");
        });

        scheduleLocalNotification({
            id: 5,
            title: `تنبيه بدخول وقت الصلاة 🔔`,
            text: `حان الآن وقت صلاة ${name} ⏰ ${time}`,
            smallIcon: 'res://drawable-xxxhdpi/ic_stat_onesignal_default.png',
            badge: 1,
            actions: [{ id: 'closeAudio', title: 'إيقاف' }],
        });

        ClickEvent("closeAudio", () => {
            audioAdhan.pause();
            audioAdhan.currentTime = 0;
        })

        audioAdhan.addEventListener("pause", async () => {
            if (audioAdhan.currentTime !== 0) {
                await audioAdhan.play();
            }
        });

    }

    else {

        setTimeout(() => {

            if (bool(adhanPlaying)) {
                localStorageData.setItem('AdhanPlaying', "false");
            }

        }, 70000);
    }

}



async function iiqamaTime(name, time, minute) {
    try {
        const minuteInMillis = 60 * 1000;
        const millis = minute * minuteInMillis;
        await new Promise(r => setTimeout(r, millis));
        const audio = new Audio("/mp3/iiqama.mp3");
        await audio.play();

        scheduleLocalNotification({
            id: 123,
            title: `حَانَ الانْ وَقْتُ الإِقَامَةِ 🔔`,
            text: `حَانَ الانْ وَقْتُ الإِقَامَةِ لصلاة ${name} - ${time} ⏰`,
            smallIcon: 'res://drawable-xxxhdpi/ic_stat_onesignal_default.png',
            badge: 1,
        });

        audio.addEventListener('ended', () => {
            audioAdhan.pause();
            audioAdhan.currentTime = 0;
            cancelLocalNotification(123);
        });
    } catch (error) {
        console.error(error);
    }
}