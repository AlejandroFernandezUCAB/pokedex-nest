import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import axios, { AxiosInstance } from 'axios';
import { Model } from 'mongoose';
import { Pokemon } from 'src/pokemon/entities/pokemon.entity';
import { PokeResponse } from './interfaces/poke-response.interfaces';
import { AxiosAdapter } from '../common/adapters/axios.adapter';

@Injectable()
export class SeedService {
	constructor(
		@InjectModel(Pokemon.name)
		private pokemonModel: Model<Pokemon>,

		private readonly http: AxiosAdapter,
	) {}

	async executeSeed() {
		await this.pokemonModel.deleteMany({});

		const data = await this.http.get<PokeResponse>(
			`https://pokeapi.co/api/v2/pokemon?limit=10000`,
		);

		//const insertPromisesArray = [];
		const pokemonToInsert: { name: string; no: number }[] = [];

		data.results.forEach(async ({ name, url }) => {
			const segments = url.split('/');
			const no = +segments[segments.length - 2];
			pokemonToInsert.push({ name, no });
			//const pokemon = await this.pokemonModel.create({ name, no });
			//insertPromisesArray.push(this.pokemonModel.create({ name, no }));
		});

		await this.pokemonModel.insertMany(pokemonToInsert);
		//await Promise.all(insertPromisesArray);

		return 'Seed Executed';
	}
}
