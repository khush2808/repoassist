'use client'
import {useUser} from '@clerk/nextjs'
import React from 'react'

export default function DashboardPage(){
	const {user}= useUser();
	return (<div>
		<h1>Dashboard</h1>
		<div>Hi {user?.firstName} {user?.lastName}</div>
	
	</div>)
}