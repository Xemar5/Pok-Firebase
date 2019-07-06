import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Timestamp } from '@google-cloud/firestore';
admin.initializeApp();

interface LeaderboardEntry {
    guid: string;
    username: string;
    score: number;
    invscore: number;
    rank: number;
}

const maxLeaderboardSize = 5;


export const getUniqueGuid = functions.https.onCall((data, context) =>
{
    const timestamp = Timestamp.now();
    const ref = admin.database().ref("server/users");
    const uid = ref.push({"registered": timestamp}).key;
    return uid;
});

export const getUniqueGuidRequest = functions.https.onRequest((request, response) =>
{
    const timestamp = Timestamp.now();
    const ref = admin.database().ref("server/users");
    const uid = ref.push({"registered": timestamp}).key;
    response.set('Access-Control-Allow-Origin', '*');
    response.send(uid);
});


export const setScore = functions.https.onCall(async (data, context) =>
{
    const query = JSON.parse(data) as LeaderboardEntry;
    console.log(query);
    
    const ref = admin.database().ref("server/scores");
    await ref.child(query.guid).set(query);
    await ref.orderByChild("invscore").once("value", async (snapshot) => 
    {
        let index = 1;
        const promises: Promise<void>[] = [];
        snapshot.forEach(x =>
        {
            const value = x.val();
            value.rank = index;
            promises.push(x.ref.update(value));
            index += 1;
        });
        await Promise.all(promises);
    });
    return 0;
});

export const setScoreRequest = functions.https.onRequest(async (request, response) =>
{
    console.log(request.body);
    const query = JSON.parse(request.body) as LeaderboardEntry;
    console.log(query);
    
    const ref = admin.database().ref("server/scores");
    await ref.child(query.guid).set(query);
    await ref.orderByChild("invscore").once("value", async (snapshot) => 
    {
        let index = 1;
        const promises: Promise<void>[] = [];
        snapshot.forEach(x =>
        {
            const value = x.val();
            value.rank = index;
            promises.push(x.ref.update(value));
            index += 1;
        });
        await Promise.all(promises);
    });
    response.set('Access-Control-Allow-Origin', '*');
    response.send(200);
});


export const getRanking = functions.https.onCall(async (data, context) =>
{
    const query = JSON.parse(data) as LeaderboardEntry;
    console.log(query);
    
    const entries: LeaderboardEntry[] = [];
    let userIndex = -1;
    const ref = admin.database().ref("server/scores");
    await ref.orderByChild("rank").limitToFirst(maxLeaderboardSize).once("value", function(snapshot) {
        snapshot.forEach(x => {
            const val = x.val();
            console.log(val);
            
            if (query.guid !== null && query.guid !== '' && val.guid === query.guid)
            {
                userIndex = val.rank - 1;
            }
            if (val.guid !== null)
            {
                entries.push(val as LeaderboardEntry);
            }
        });
    });

    
    if (userIndex === -1 && query.guid !== null && query.guid !== '')
    {
        console.log("User not present. Adding to list");
        await ref.child(query.guid).once("value", function(snapshot)
        {
            const local: LeaderboardEntry = snapshot.val();
            entries.push(local);
            userIndex = maxLeaderboardSize;
        });
        
    }

    const response = {
        senderIndex: userIndex,
        entries: entries
    };

    return JSON.stringify(response);
});

export const getRankingRequest = functions.https.onRequest(async (request, response) =>
{
    console.log(request.body);
    console.log(request.rawBody);
    const query = JSON.parse(request.body) as LeaderboardEntry;
    console.log(query);
    
    const entries: LeaderboardEntry[] = [];
    let userIndex = -1;
    const ref = admin.database().ref("server/scores");
    await ref.orderByChild("rank").limitToFirst(maxLeaderboardSize).once("value", function(snapshot) {
        snapshot.forEach(x => {
            const val = x.val();
            console.log(val);
            
            if (query.guid !== null && query.guid !== '' && val.guid === query.guid)
            {
                userIndex = val.rank - 1;
            }
            if (val.guid !== null)
            {
                entries.push(val as LeaderboardEntry);
            }
        });
    });

    
    if (userIndex === -1 && query.guid !== null && query.guid !== '')
    {
        console.log("User not present. Adding to list");
        await ref.child(query.guid).once("value", function(snapshot)
        {
            const local: LeaderboardEntry = snapshot.val();
            entries.push(local);
            userIndex = maxLeaderboardSize;
        });
        
    }

    const data = {
        senderIndex: userIndex,
        entries: entries
    };

    response.set('Access-Control-Allow-Origin', '*');
    response.send(JSON.stringify(data));
});


